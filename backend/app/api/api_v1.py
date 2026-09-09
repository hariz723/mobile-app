from fastapi import APIRouter

from app.api import admin, auth, health, location

api_router = APIRouter()

# Health checks
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(location.router, prefix="/location", tags=["Location"])
api_router.include_router(admin.router, prefix="/admin", tags=["Administration"])
