"""WebSocket manager for real-time location event distribution."""

from app.realtime import LocationBroadcaster, location_broadcaster

__all__ = ["LocationBroadcaster", "location_broadcaster"]
