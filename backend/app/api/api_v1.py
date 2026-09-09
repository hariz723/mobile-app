from fastapi import APIRouter
from app.api import health

api_router = APIRouter()

# Health checks
api_router.include_router(health.router, tags=["Health"])

# Subsequent phases will register:
# from app.api import auth, location, admin
# api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
# api_router.include_router(location.router, prefix="/location", tags=["Location"])
# api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
