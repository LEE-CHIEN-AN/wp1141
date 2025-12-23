from functools import lru_cache
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized configuration for the shadow routing backend."""

    timezone: str = Field("Asia/Taipei", description="Timezone for solar position calculations.")
    default_height_m: float = Field(20.0, description="Fallback building height if data is missing.")
    bounding_box_buffer_m: float = Field(200.0, description="Padding around the start/end bounding box.")  # Reduced from 300m for memory optimization
    sample_spacing_m: float = Field(15.0, description="Distance (m) between shade sampling points on edges.")  # 增加間距，減少 sample 點
    alpha: float = Field(0.5, ge=0.0, le=1.0, description="Weight between shade preference and distance.")
    cache_ttl_seconds: int = Field(3600, description="Cache lifetime for identical route queries.")
    cache_size: int = Field(16, description="Maximum cached route computations.")  # Reduced from 32 for memory optimization
    request_timeout_seconds: float = Field(120.0, description="Maximum time for a route calculation request.")
    cache_distance_threshold_m: float = Field(5.0, description="Maximum distance (meters) for cache matching.")
    cache_time_threshold_minutes: float = Field(20.0, description="Maximum time difference (minutes) for cache matching.")
    cache_dir: str = Field("cache", description="Directory for persistent cache files.")
    building_dataset: str = Field(
        default="data/4342.json",
        description="Path to the GeoJSON (or GeoPackage) containing building footprints.",
    )
    use_supabase: bool = Field(
        default=False,
        description="Use Supabase database for building queries instead of local files.",
    )
    use_supabase_street_graph: bool = Field(
        default=False,
        description="Use Supabase database for street graph queries instead of OSMnx.",
    )
    shadow_precompute_enabled: bool = Field(
        default=True,
        description="Enable precomputed shadow maps for faster query responses.",
    )
    shadow_retention_days: int = Field(
        default=7,
        ge=1,
        description="Number of days to retain precomputed shadow maps.",
    )

    model_config = SettingsConfigDict(
        env_prefix="SHADOW_",
        env_file=str(Path(__file__).parent.parent / ".env"),  # Load from project root (string path)
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore extra env vars (like SUPABASE_URL, VITE_*, etc.)
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return memoized settings instance."""
    return Settings()  # type: ignore[call-arg]

