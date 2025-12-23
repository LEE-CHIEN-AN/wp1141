import asyncio
import logging
import os
import traceback
import time
from datetime import datetime
from typing import List

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware

from backend import ShadowRoutingService, get_settings
import networkx as nx

# Try to import psutil for memory monitoring
try:
    import psutil
    _PSUTIL_AVAILABLE = True
except ImportError:
    _PSUTIL_AVAILABLE = False

# 配置日誌級別
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Shadow Navigation API",
    description="Backend service that computes shade-aware pedestrian routes.",
    version="0.1.0",
)

# 允許 CORS（讓前端可以訪問）
# Note: Cannot use allow_origins=["*"] with allow_credentials=True
# For production, explicitly list allowed origins via ALLOWED_ORIGINS env var
# Format: "https://domain1.com,https://domain2.com" or "*" for all
# Example for Vercel: "https://your-app.vercel.app,https://your-app-git-main.vercel.app"
# IMPORTANT: Set ALLOWED_ORIGINS in your production environment (Render, etc.)
# to include your frontend domain(s) to avoid CORS errors
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
if allowed_origins_env == "*":
    # Allow all origins (for development)
    # Cannot use credentials with "*"
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,  # Must be False when using "*"
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Use specific origins (for production)
    # Can use credentials with specific origins
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# 請求超時中間件
class TimeoutMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            # 設置 120 秒超時
            response = await asyncio.wait_for(call_next(request), timeout=120.0)
            return response
        except asyncio.TimeoutError:
            logger.error(f"Request timeout: {request.url}")
            return JSONResponse(
                status_code=504,
                content={"detail": "Request timeout: calculation took too long (>120s)"}
            )


# 請求時間追蹤中間件
class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 記錄請求接收時間（使用 perf_counter 確保高精度和單調性）
        request_received_at = time.perf_counter()
        
        # 將時間戳添加到 request state，供後續使用
        request.state.request_received_at = request_received_at
        
        # 記錄請求開始
        logger.info(f"[TIMING] Request received: {request.method} {request.url.path}")
        
        # 處理請求
        response = await call_next(request)
        
        # 計算總處理時間
        request_processed_at = time.perf_counter()
        total_processing_ms = (request_processed_at - request_received_at) * 1000
        
        # 在響應頭中添加時間資訊（只使用相對時間）
        response.headers["X-Processing-Time-Ms"] = str(round(total_processing_ms, 2))
        
        logger.info(f"[TIMING] Request completed: {request.method} {request.url.path} in {total_processing_ms:.2f}ms")
        
        return response


app.add_middleware(TimeoutMiddleware)
app.add_middleware(TimingMiddleware)

service = ShadowRoutingService()


class ShadowSegment(BaseModel):
    polyline: List[List[float]]
    is_shaded: bool
    shade_fraction: float


class RouteResponse(BaseModel):
    polyline: List[List[float]]
    shadow_ratio: float = Field(..., ge=0.0, le=1.0)
    shadow_segments: List[ShadowSegment]
    metadata: dict


@app.get("/healthz")
def health_check():
    settings = get_settings()
    return {
        "status": "ok",
        "timezone": settings.timezone,
        "building_dataset": settings.building_dataset,
    }


@app.get("/api/debug/memory")
async def get_memory_info():
    """Get current memory usage for debugging."""
    if not _PSUTIL_AVAILABLE:
        return {
            "error": "psutil not available",
            "message": "Install psutil to enable memory monitoring"
        }
    
    try:
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        virtual_memory = psutil.virtual_memory()
        
        return {
            "process": {
                "rss_mb": round(memory_info.rss / 1024 / 1024, 2),  # Resident Set Size (actual memory)
                "vms_mb": round(memory_info.vms / 1024 / 1024, 2),  # Virtual Memory Size
                "percent": round(process.memory_percent(), 2),
            },
            "system": {
                "available_mb": round(virtual_memory.available / 1024 / 1024, 2),
                "total_mb": round(virtual_memory.total / 1024 / 1024, 2),
                "used_mb": round(virtual_memory.used / 1024 / 1024, 2),
                "percent": round(virtual_memory.percent, 2),
            },
            "cache": {
                "memory_cache_size": len(service._memory_cache),
                "cache_dir": str(service.cache_dir),
            }
        }
    except Exception as e:
        logger.error(f"Error getting memory info: {e}", exc_info=True)
        return {
            "error": str(e),
            "message": "Failed to get memory information"
        }


@app.get("/route", response_model=RouteResponse)
async def route(
    request: Request,
    start_lat: float = Query(..., description="Starting latitude"),
    start_lon: float = Query(..., description="Starting longitude"),
    end_lat: float = Query(..., description="Ending latitude"),
    end_lon: float = Query(..., description="Ending longitude"),
    timestamp: datetime = Query(..., alias="time", description="ISO timestamp for departure time"),
    alpha: float | None = Query(None, ge=0.0, le=1.0, description="Shade preference weight"),
):
    """
    計算影子導航路線。
    
    注意：此操作可能需要 10-120 秒，請耐心等待。
    如果超過 120 秒會自動超時。
    """
    try:
        # 記錄端點處理開始時間（在端點層記錄，確保與 service 在同一執行上下文）
        endpoint_start = time.perf_counter()
        request_received_at = getattr(request.state, 'request_received_at', endpoint_start)
        middleware_to_endpoint_ms = (endpoint_start - request_received_at) * 1000
        
        logger.info(f"[TIMING] /route endpoint received request (middleware to endpoint: {middleware_to_endpoint_ms:.2f}ms)")
        
        # 在背景執行緒中執行計算，避免阻塞事件循環
        loop = asyncio.get_event_loop()
        computation_start = time.perf_counter()
        
        # 傳遞端點開始時間（而不是 middleware 時間），確保時間測量準確
        result = await loop.run_in_executor(
            None,
            lambda: service.route(start_lat, start_lon, end_lat, end_lon, timestamp, alpha=alpha, request_start_time=endpoint_start)
        )
        
        computation_end = time.perf_counter()
        computation_ms = (computation_end - computation_start) * 1000
        logger.info(f"[TIMING] /route computation completed in {computation_ms:.2f}ms")
        
        # 準備響應
        response_start = time.perf_counter()
        response_data = RouteResponse(**result.__dict__)
        response_end = time.perf_counter()
        response_prep_ms = (response_end - response_start) * 1000
        
        logger.info(f"[TIMING] /route response prepared in {response_prep_ms:.2f}ms")
        
        return response_data
    except asyncio.TimeoutError:
        logger.error("Route calculation timeout")
        raise HTTPException(status_code=504, detail="Calculation timeout (>120s)") from None
    except ValueError as exc:
        logger.warning(f"Validation error: {exc}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        logger.error(f"Dataset missing: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Dataset missing: {exc}") from exc
    except Exception as exc:
        # Check for NetworkXNoPath specifically
        error_type_name = type(exc).__name__
        if error_type_name == "NetworkXNoPath":
            error_msg = f"No path found between start and end points. The locations may not be connected by the street network."
            logger.warning(f"Routing error: {error_msg} - {str(exc)}")
            raise HTTPException(status_code=404, detail=error_msg) from exc
        
        error_msg = f"Internal error: {error_type_name}: {str(exc)}"
        logger.error(error_msg, exc_info=True)
        # 在開發環境中返回完整堆疊追蹤
        import sys
        if sys.flags.dev_mode:
            detail = f"{error_msg}\n\n{traceback.format_exc()}"
        else:
            detail = error_msg
        raise HTTPException(status_code=500, detail=detail) from exc


@app.get("/route/shortest", response_model=RouteResponse)
async def shortest_route(
    request: Request,
    start_lat: float = Query(..., description="Starting latitude"),
    start_lon: float = Query(..., description="Starting longitude"),
    end_lat: float = Query(..., description="Ending latitude"),
    end_lon: float = Query(..., description="Ending longitude"),
):
    """
    計算最短距離路線（不考慮陰影）。
    
    使用與陰影路線相同的 OSMnx 街道網路，確保公平比較。
    注意：此操作可能需要 5-30 秒，請耐心等待。
    """
    try:
        endpoint_start = time.perf_counter()
        request_received_at = getattr(request.state, 'request_received_at', endpoint_start)
        middleware_to_endpoint_ms = (endpoint_start - request_received_at) * 1000
        
        logger.info(f"[TIMING] /route/shortest endpoint received request (middleware to endpoint: {middleware_to_endpoint_ms:.2f}ms)")
        
        computation_start = time.perf_counter()
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: service.shortest_route(start_lat, start_lon, end_lat, end_lon)
        )
        computation_ms = (time.perf_counter() - computation_start) * 1000
        
        logger.info(f"[TIMING] /route/shortest computation completed in {computation_ms:.2f}ms")
        return RouteResponse(**result.__dict__)
    except asyncio.TimeoutError:
        logger.error("Shortest route calculation timeout")
        raise HTTPException(status_code=504, detail="Calculation timeout (>120s)") from None
    except ValueError as exc:
        logger.warning(f"Validation error: {exc}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except nx.NetworkXNoPath as exc:
        # NetworkXNoPath: no path exists between nodes
        error_msg = f"No path found between start and end points. The locations may not be connected by the street network."
        logger.warning(f"Routing error: {error_msg} - {str(exc)}")
        raise HTTPException(status_code=404, detail=error_msg) from exc
    except Exception as exc:
        # Check for NetworkXNoPath by type name as fallback
        error_type_name = type(exc).__name__
        if error_type_name == "NetworkXNoPath":
            error_msg = f"No path found between start and end points. The locations may not be connected by the street network."
            logger.warning(f"Routing error: {error_msg} - {str(exc)}")
            raise HTTPException(status_code=404, detail=error_msg) from exc
        
        error_msg = f"Internal error: {error_type_name}: {str(exc)}"
        logger.error(error_msg, exc_info=True)
        import sys
        if sys.flags.dev_mode:
            detail = f"{error_msg}\n\n{traceback.format_exc()}"
        else:
            detail = error_msg
        raise HTTPException(status_code=500, detail=detail) from exc


@app.get("/shadows")
async def get_shadows(
    request: Request,
    min_lon: float = Query(..., description="Minimum longitude (west)"),
    min_lat: float = Query(..., description="Minimum latitude (south)"),
    max_lon: float = Query(..., description="Maximum longitude (east)"),
    max_lat: float = Query(..., description="Maximum latitude (north)"),
    timestamp: datetime = Query(..., alias="time", description="ISO timestamp for shadow calculation"),
    center_lat: float | None = Query(None, description="Center latitude for solar position (defaults to bbox center)"),
    center_lon: float | None = Query(None, description="Center longitude for solar position (defaults to bbox center)"),
):
    """
    計算指定區域和時間的建築物陰影。
    
    返回 GeoJSON FeatureCollection，包含該區域內所有建築物的陰影多邊形。
    注意：此操作可能需要 2-10 秒，請耐心等待。
    """
    try:
        endpoint_start = time.perf_counter()
        request_received_at = getattr(request.state, 'request_received_at', endpoint_start)
        middleware_to_endpoint_ms = (endpoint_start - request_received_at) * 1000
        
        logger.info(f"[TIMING] /shadows endpoint received request (middleware to endpoint: {middleware_to_endpoint_ms:.2f}ms)")
        
        computation_start = time.perf_counter()
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: service.compute_shadows(
                min_lon=min_lon,
                min_lat=min_lat,
                max_lon=max_lon,
                max_lat=max_lat,
                timestamp=timestamp,
                center_lat=center_lat,
                center_lon=center_lon,
            )
        )
        computation_ms = (time.perf_counter() - computation_start) * 1000
        
        logger.info(f"[TIMING] /shadows computation completed in {computation_ms:.2f}ms")
        return result
    except ValueError as exc:
        logger.warning(f"Validation error: {exc}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        error_msg = f"Internal error: {type(exc).__name__}: {str(exc)}"
        logger.error(error_msg, exc_info=True)
        import sys
        if sys.flags.dev_mode:
            detail = f"{error_msg}\n\n{traceback.format_exc()}"
        else:
            detail = error_msg
        raise HTTPException(status_code=500, detail=detail) from exc

