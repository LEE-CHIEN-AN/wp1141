"""Supabase connection configuration."""
from functools import lru_cache
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class SupabaseConfig(BaseSettings):
    """Supabase connection configuration."""

    # Supabase connection settings
    supabase_url: str = Field(
        default="",
        description="Your Supabase project URL (e.g., https://your-project.supabase.co)",
    )
    supabase_key: str = Field(
        default="",
        description="Supabase Service Role Key (from Dashboard → Settings → API)",
    )
    supabase_publishable_key: str = Field(
        default="",
        description="Supabase publishable key (optional, for frontend use)",
    )

    # Database connection (for direct PostgreSQL access)
    db_host: str = Field(
        default="",
        description="Database host (from Supabase connection string)",
    )
    db_port: int = Field(default=5432, description="Database port")
    db_name: str = Field(default="postgres", description="Database name")
    db_user: str = Field(default="postgres", description="Database user")
    db_password: str = Field(default="", description="Database password")

    model_config = SettingsConfigDict(
        env_prefix="SUPABASE_",
        env_file=str(Path(__file__).parent.parent / ".env"),  # Load from project root (string path)
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore extra env vars
        case_sensitive=False,
    )


@lru_cache()
def get_supabase_config() -> SupabaseConfig:
    """Return memoized Supabase configuration instance."""
    return SupabaseConfig()

