"""
使用 PostgreSQL 直接連接查詢路網圖（避免 Supabase REST API 的 1000 行限制）。

這個模組使用 psycopg2 直接連接 PostgreSQL，可以查詢任意大小的結果集。

使用連接池來重用連接，避免達到 Supabase 的連接限制：
- Supabase 免費方案：約 60-100 個連接
- 使用連接池可以重用連接，減少連接數
"""
from functools import lru_cache
from typing import Tuple, Optional, Any, cast
import logging
import threading

import geopandas as gpd
import networkx as nx
from shapely.geometry import Polygon, shape
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
import json

from .config import get_supabase_config

logger = logging.getLogger(__name__)

# 全域連接池（thread-safe）
_connection_pool: Optional[pool.ThreadedConnectionPool] = None
_pool_lock = threading.Lock()


def _get_connection_pool() -> pool.ThreadedConnectionPool:
    """
    取得 PostgreSQL 連接池（thread-safe）。
    
    使用連接池來重用連接，避免達到 Supabase 的連接限制。
    預設池大小：最小 2，最大 10（可透過環境變數調整）。
    """
    global _connection_pool
    
    if _connection_pool is not None:
        return _connection_pool
    
    with _pool_lock:
        # 雙重檢查（double-check locking）
        if _connection_pool is not None:
            return _connection_pool
        
        config = get_supabase_config()
        
        # 確保載入 .env 文件（DATABASE_URL 可能不在 SupabaseConfig 中）
        from dotenv import load_dotenv
        from pathlib import Path
        load_dotenv(Path(__file__).parent.parent / ".env")
        
        # 從環境變數或 config 取得連接資訊
        import os
        db_host = os.getenv("SUPABASE_DB_HOST") or config.db_host
        db_port = int(os.getenv("SUPABASE_DB_PORT", "5432") or str(config.db_port))
        db_name = os.getenv("SUPABASE_DB_NAME", "postgres") or config.db_name
        db_user = os.getenv("SUPABASE_DB_USER", "postgres") or config.db_user
        db_password = os.getenv("SUPABASE_DB_PASSWORD") or config.db_password
        
        # 連接池大小（可透過環境變數調整）
        min_conn = int(os.getenv("SUPABASE_POOL_MIN_CONN", "2"))
        max_conn = int(os.getenv("SUPABASE_POOL_MAX_CONN", "10"))
        
        # 或者使用完整的連接字串（優先使用 DATABASE_URL）
        connection_string = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
        
        if connection_string:
            # 解析並清理連接字串（移除 psycopg2 不支援的參數）
            from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
            
            parsed = urlparse(connection_string)
            query_params = parse_qs(parsed.query)
            
            # 移除 pgbouncer 參數（psycopg2 不支援，但 Supabase 連接字串可能包含它）
            query_params.pop('pgbouncer', None)
            
            # 確保有 sslmode 參數
            if 'sslmode' not in query_params:
                query_params['sslmode'] = ['require']
            
            # 重建查詢字串
            new_query = urlencode(query_params, doseq=True)
            cleaned_connection_string = urlunparse((
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                parsed.params,
                new_query,
                parsed.fragment
            ))
            
            logger.debug(f"清理連接字串，移除 pgbouncer 參數（psycopg2 不支援）")
            
            # 使用清理後的連接字串建立連接池
            try:
                _connection_pool = pool.ThreadedConnectionPool(
                    min_conn,
                    max_conn,
                    cleaned_connection_string,
                    connect_timeout=10,  # 10 seconds to establish connection
                )
            except Exception as e:
                # 只顯示連接字串的主機部分，隱藏密碼
                safe_connection_string = cleaned_connection_string.split('@')[0] + "@***" if '@' in cleaned_connection_string else "***"
                raise ValueError(
                    f"無法建立 PostgreSQL 連接池。請檢查 DATABASE_URL 是否正確。\n"
                    f"錯誤: {e}\n"
                    f"清理後的連接字串: {safe_connection_string} (已移除 pgbouncer 參數)\n"
                    f"請確保連接字串包含正確的主機、端口、用戶名、密碼和資料庫名稱。"
                ) from e
        elif db_host and db_password:
            # 使用個別參數建立連接池
            _connection_pool = pool.ThreadedConnectionPool(
                min_conn,
                max_conn,
                host=db_host,
                port=db_port,
                database=db_name,
                user=db_user,
                password=db_password,
                sslmode="require",  # Supabase 需要 SSL
                connect_timeout=10,  # 10 seconds to establish connection
            )
        else:
            raise ValueError(
                "需要設定 PostgreSQL 連接資訊。\n"
                "方法 1: 設定 DATABASE_URL 環境變數（Supabase Dashboard → Settings → Database → Connection string）\n"
                "方法 2: 設定 SUPABASE_DB_HOST, SUPABASE_DB_PASSWORD 等環境變數"
            )
        
        logger.info(f"PostgreSQL 連接池已建立（最小: {min_conn}, 最大: {max_conn}）")
        return _connection_pool


def get_postgres_connection():
    """
    從連接池取得一個 PostgreSQL 連接。
    
    使用完畢後必須呼叫 pool.putconn(conn) 將連接歸還到池中。
    建議使用 context manager 或 try-finally 確保連接正確歸還。
    """
    pool = _get_connection_pool()
    try:
        conn = pool.getconn()
        return conn
    except Exception as e:
        logger.error(f"無法從連接池取得連接: {e}", exc_info=True)
        raise


def get_street_graph_in_bbox_pg(
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
) -> Tuple[nx.MultiDiGraph, gpd.GeoDataFrame, gpd.GeoDataFrame]:
    """
    從 PostgreSQL 直接查詢路網圖（無 1000 行限制）。
    
    使用連接池重用連接，避免達到 Supabase 的連接限制。
    """
    print("📊 [路網圖來源] 使用 PostgreSQL 直接連接從 Supabase 查詢路網圖")
    logger.info("📊 使用 PostgreSQL 直接連接從 Supabase 查詢路網圖")
    conn = get_postgres_connection()
    
    try:
        # Set statement timeout to 60 seconds to prevent hanging queries
        with conn.cursor() as timeout_cur:
            timeout_cur.execute("SET statement_timeout = 60000")  # 60 seconds in milliseconds
        conn.commit()
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 查詢 nodes
            cur.execute("""
                SELECT 
                    osmid,
                    ST_AsGeoJSON(geometry)::jsonb as geometry,
                    y,
                    x,
                    street_count
                FROM street_graph_nodes
                WHERE ST_Intersects(
                    geometry,
                    ST_MakeEnvelope(%s, %s, %s, %s, 4326)
                )
            """, (min_lon, min_lat, max_lon, max_lat))
            
            nodes_rows = []
            node_geometries = []
            node_osmids = []
            
            for row in cur.fetchall():
                geom_data = row["geometry"]
                if isinstance(geom_data, dict):
                    geom = shape(geom_data)
                    nodes_rows.append({
                        "osmid": row["osmid"],
                        "y": row["y"],
                        "x": row["x"],
                        "street_count": row.get("street_count", 0),
                    })
                    node_geometries.append(geom)
                    node_osmids.append(row["osmid"])
            
            nodes = gpd.GeoDataFrame(nodes_rows, geometry=node_geometries, crs="EPSG:4326")
            nodes.set_index("osmid", inplace=True)
            
            print(f"  ✓ 找到 {len(nodes)} 個節點")
            logger.debug(f"Found {len(nodes)} nodes")
            
            # 查詢 edges（查詢所有連接到這些 nodes 的 edges）
            if node_osmids:
                # 使用 ANY 查詢，沒有行數限制
                cur.execute("""
                    SELECT 
                        u,
                        v,
                        key,
                        ST_AsGeoJSON(geometry)::jsonb as geometry,
                        length,
                        name,
                        highway
                    FROM street_graph_edges
                    WHERE u = ANY(%s) OR v = ANY(%s)
                """, (node_osmids, node_osmids))
                
                edges_rows = []
                edge_geometries = []
                
                for row in cur.fetchall():
                    geom_data = row["geometry"]
                    if isinstance(geom_data, dict):
                        geom = shape(geom_data)
                        edges_rows.append({
                            "u": row["u"],
                            "v": row["v"],
                            "key": row.get("key", 0),
                            "length": row.get("length", 0.0),
                            "name": row.get("name"),
                            "highway": row.get("highway"),
                        })
                        edge_geometries.append(geom)
                
                edges = gpd.GeoDataFrame(edges_rows, geometry=edge_geometries, crs="EPSG:4326")
                edges.set_index(["u", "v", "key"], inplace=True)
                
                # 補查缺失的 nodes（edges 可能連接到 bbox 外的 nodes）
                edge_node_ids = set()
                for idx, row in edges.iterrows():
                    # idx is a tuple (u, v, key) when using MultiIndex
                    # Use tuple unpacking for better type inference
                    u, v, _key = idx  # type: ignore
                    edge_node_ids.add(u)
                    edge_node_ids.add(v)
                
                missing_node_ids = edge_node_ids - set(node_osmids)
                if missing_node_ids:
                    logger.debug(f"Found {len(missing_node_ids)} missing nodes, querying them...")
                    cur.execute("""
                        SELECT 
                            osmid,
                            ST_AsGeoJSON(geometry)::jsonb as geometry,
                            y,
                            x,
                            street_count
                        FROM street_graph_nodes
                        WHERE osmid = ANY(%s)
                    """, (list(missing_node_ids),))
                    
                    for row in cur.fetchall():
                        geom_data = row["geometry"]
                        if isinstance(geom_data, dict):
                            geom = shape(geom_data)
                            nodes_rows.append({
                                "osmid": row["osmid"],
                                "y": row["y"],
                                "x": row["x"],
                                "street_count": row.get("street_count", 0),
                            })
                            node_geometries.append(geom)
                            node_osmids.append(row["osmid"])
                    
                    # 重建 nodes GeoDataFrame
                    nodes = gpd.GeoDataFrame(nodes_rows, geometry=node_geometries, crs="EPSG:4326")
                    nodes.set_index("osmid", inplace=True)
                    logger.debug(f"Added {len(missing_node_ids)} missing nodes, total: {len(nodes)}")
            else:
                edges = gpd.GeoDataFrame(
                    columns=["u", "v", "key", "length", "name", "highway"],
                    geometry=[],
                    crs="EPSG:4326"
                )
                edges.set_index(["u", "v", "key"], inplace=True)
            
            print(f"  ✓ 找到 {len(edges)} 條邊")
            logger.debug(f"Found {len(edges)} edges")
            
            # 重建 NetworkX graph
            G = nx.MultiDiGraph()
            G.graph["crs"] = "EPSG:4326"
            
            for osmid, row in nodes.iterrows():
                G.add_node(
                    osmid,
                    y=row["y"],
                    x=row["x"],
                    geometry=row.geometry,
                    street_count=row.get("street_count", 0),
                )
            
            for (u, v, key), row in edges.iterrows():  # type: ignore
                G.add_edge(
                    u,
                    v,
                    key=key,
                    length=row.get("length", 0.0),
                    name=row.get("name"),
                    highway=row.get("highway"),
                    geometry=row.geometry,
                )
            
            # Filter to largest connected component (like OSMnx retain_all=False)
            # This removes disconnected islands that cause routing failures
            if G.is_directed():
                components = list(nx.strongly_connected_components(G))
            else:
                components = list(nx.weakly_connected_components(G))
            
            if len(components) > 1:
                logger.info(f"Graph has {len(components)} connected components, keeping only the largest")
                component_sizes = [len(comp) for comp in components]
                largest_component = max(components, key=len)
                logger.info(f"Component sizes: {sorted(component_sizes, reverse=True)}, keeping largest ({len(largest_component)} nodes)")
                
                # Create subgraph with only the largest component
                # subgraph().copy() returns the same graph type (MultiDiGraph)
                G = G.subgraph(largest_component).copy()  # type: ignore[assignment]
                
                # Update nodes and edges GeoDataFrames to match
                nodes = nodes.loc[list(largest_component)]
                # Filter edges to only those in the largest component
                edges = edges[edges.index.get_level_values('u').isin(largest_component) & 
                              edges.index.get_level_values('v').isin(largest_component)]
            
            print(f"  ✓ 圖形重建完成: {len(G.nodes)} 個節點, {len(G.edges)} 條邊")
            logger.debug(f"Graph reconstructed: {len(G.nodes)} nodes, {len(G.edges)} edges")
            
            # Type assertions for return value
            return cast(nx.MultiDiGraph, G), cast(gpd.GeoDataFrame, nodes), cast(gpd.GeoDataFrame, edges)
            
    finally:
        # 將連接歸還到連接池（不是真正關閉）
        pool = _get_connection_pool()
        pool.putconn(conn)


def get_street_graph_in_polygon_pg(polygon: Polygon) -> Tuple[nx.MultiDiGraph, gpd.GeoDataFrame, gpd.GeoDataFrame]:
    """
    從 PostgreSQL 直接查詢路網圖（無 1000 行限制）。
    """
    bounds = polygon.bounds
    min_lon, min_lat, max_lon, max_lat = bounds
    
    return get_street_graph_in_bbox_pg(min_lon, min_lat, max_lon, max_lat)

