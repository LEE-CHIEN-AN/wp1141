#!/usr/bin/env python3
"""
清除所有快取文件的腳本

此腳本會清除：
- 路由快取文件 (cache/route/*.json, cache/route/index.json)
- 路網圖快取文件 (cache/street_graphs/*.graphml, *_nodes.gpkg, *_edges.gpkg)
- 內存快取（需要重啟服務器才能清除）
- 其他可能的快取文件

使用方式：
    python scripts/clear_cache.py [--dry-run] [--verbose]
"""

import sys
from pathlib import Path
import argparse
import logging

# 添加項目根目錄到 Python 路徑
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.config import get_settings

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)


def clear_cache_directory(cache_path: Path, cache_name: str, dry_run: bool = False, verbose: bool = False):
    """
    清空指定的快取目錄
    
    Parameters
    ----------
    cache_path : Path
        快取目錄路徑
    cache_name : str
        快取名稱（用於日誌）
    dry_run : bool
        是否為試運行模式（不實際刪除）
    verbose : bool
        是否顯示詳細信息
    """
    if not cache_path.exists():
        if verbose:
            logger.info(f"{cache_name} 快取目錄不存在: {cache_path}")
        return 0
    
    deleted_count = 0
    deleted_size = 0
    
    # 遞歸查找所有文件（不包括子目錄本身）
    for item in cache_path.rglob('*'):
        if item.is_file():
            file_size = item.stat().st_size
            if verbose:
                logger.debug(f"找到文件: {item.relative_to(cache_path.parent)} ({file_size:,} bytes)")
            
            if not dry_run:
                try:
                    item.unlink()
                    deleted_count += 1
                    deleted_size += file_size
                except Exception as e:
                    logger.warning(f"無法刪除文件 {item}: {e}")
            else:
                deleted_count += 1
                deleted_size += file_size
    
    if deleted_count > 0:
        size_mb = deleted_size / (1024 * 1024)
        if dry_run:
            logger.info(f"[試運行] 將刪除 {deleted_count} 個 {cache_name} 快取文件 ({size_mb:.2f} MB)")
        else:
            logger.info(f"已刪除 {deleted_count} 個 {cache_name} 快取文件 ({size_mb:.2f} MB)")
    else:
        if verbose:
            logger.info(f"{cache_name} 快取目錄為空: {cache_path}")
    
    return deleted_count


def clear_all_caches(dry_run: bool = False, verbose: bool = False):
    """
    清除所有快取
    
    Parameters
    ----------
    dry_run : bool
        是否為試運行模式（不實際刪除）
    verbose : bool
        是否顯示詳細信息
    """
    settings = get_settings()
    base_cache_dir = Path(settings.cache_dir)
    
    if not base_cache_dir.exists():
        logger.info(f"快取根目錄不存在: {base_cache_dir}")
        logger.info("沒有快取需要清除。")
        return
    
    logger.info("=" * 60)
    if dry_run:
        logger.info("🔍 [試運行模式] 檢查快取文件...")
    else:
        logger.info("🧹 開始清除快取...")
    logger.info("=" * 60)
    
    total_deleted = 0
    
    # 1. 清除路由快取
    logger.info("\n📁 檢查路由快取...")
    route_cache_dir = base_cache_dir / "route"
    count = clear_cache_directory(route_cache_dir, "路由", dry_run, verbose)
    total_deleted += count
    
    # 檢查是否有遺漏的文件類型
    if route_cache_dir.exists():
        all_files = list(route_cache_dir.rglob('*'))
        json_files = [f for f in all_files if f.is_file() and f.suffix == '.json']
        other_files = [f for f in all_files if f.is_file() and f.suffix != '.json']
        
        if other_files:
            logger.warning(f"⚠️  發現非 JSON 文件在路由快取目錄中: {len(other_files)} 個")
            if verbose:
                for f in other_files:
                    logger.warning(f"  - {f.name}")
    
    # 2. 清除路網圖快取
    logger.info("\n📁 檢查路網圖快取...")
    street_graph_cache_dir = base_cache_dir / "street_graphs"
    count = clear_cache_directory(street_graph_cache_dir, "路網圖", dry_run, verbose)
    total_deleted += count
    
    # 檢查是否有遺漏的文件類型
    if street_graph_cache_dir.exists():
        all_files = list(street_graph_cache_dir.rglob('*'))
        expected_extensions = {'.graphml', '.gpkg'}
        found_extensions = {f.suffix for f in all_files if f.is_file()}
        unexpected_files = [f for f in all_files if f.is_file() and f.suffix not in expected_extensions]
        
        if unexpected_files:
            logger.warning(f"⚠️  發現非預期的文件類型在路網圖快取目錄中: {len(unexpected_files)} 個")
            if verbose:
                for f in unexpected_files:
                    logger.warning(f"  - {f.name} ({f.suffix})")
        
        if verbose:
            logger.info(f"發現的文件類型: {found_extensions}")
    
    # 3. 檢查根快取目錄中的其他文件
    logger.info("\n📁 檢查根快取目錄...")
    root_files = [f for f in base_cache_dir.iterdir() if f.is_file()]
    if root_files:
        logger.warning(f"⚠️  發現 {len(root_files)} 個文件在根快取目錄中（應該在子目錄中）:")
        for f in root_files:
            if verbose:
                logger.warning(f"  - {f.name}")
            if not dry_run:
                try:
                    f.unlink()
                    total_deleted += 1
                    logger.info(f"  已刪除: {f.name}")
                except Exception as e:
                    logger.warning(f"  無法刪除 {f.name}: {e}")
    else:
        if verbose:
            logger.info("根快取目錄中沒有文件")
    
    # 4. 檢查是否有其他子目錄
    subdirs = [d for d in base_cache_dir.iterdir() if d.is_dir() and d.name not in ['route', 'street_graphs']]
    if subdirs:
        logger.warning(f"⚠️  發現 {len(subdirs)} 個未預期的子目錄:")
        for d in subdirs:
            logger.warning(f"  - {d.name}/")
            if not dry_run:
                count = clear_cache_directory(d, d.name, dry_run, verbose)
                total_deleted += count
                # 嘗試刪除空目錄
                try:
                    if not any(d.iterdir()):
                        d.rmdir()
                        logger.info(f"  已刪除空目錄: {d.name}/")
                except Exception:
                    pass
    
    # 總結
    logger.info("\n" + "=" * 60)
    if dry_run:
        logger.info(f"🔍 [試運行] 將清除 {total_deleted} 個快取文件")
        logger.info("使用 --no-dry-run 來實際執行清除操作")
    else:
        if total_deleted > 0:
            logger.info(f"✅ 成功清除 {total_deleted} 個快取文件")
            logger.info("💡 提示: 內存快取需要重啟服務器才能清除")
        else:
            logger.info("ℹ️  沒有找到需要清除的快取文件")
    logger.info("=" * 60)


def main():
    """主函數：解析命令列參數並執行清除操作"""
    parser = argparse.ArgumentParser(
        description="清除所有快取文件",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
範例:
  # 試運行（檢查但不刪除）
  python scripts/clear_cache.py --dry-run --verbose
  
  # 實際清除
  python scripts/clear_cache.py
  
  # 詳細模式
  python scripts/clear_cache.py --verbose
        """
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="試運行模式：只檢查不刪除（預設: False）"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="顯示詳細信息（預設: False）"
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        clear_all_caches(dry_run=args.dry_run, verbose=args.verbose)
    except Exception as e:
        logger.error(f"清除快取時發生錯誤: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
