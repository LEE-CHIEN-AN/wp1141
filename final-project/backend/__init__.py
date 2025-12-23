"""Backend package exposing shadow-aware routing utilities."""

from .config import get_settings
from .service import ShadowRoutingService

__all__ = ["get_settings", "ShadowRoutingService"]

