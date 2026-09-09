from typing import Any, Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel

DataT = TypeVar("DataT")


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Any | None = None


class BaseApiResponse(BaseModel):
    success: bool = True


class ApiResponse(BaseApiResponse, Generic[DataT]):
    data: DataT | None = None
    message: str | None = None


class ErrorResponse(BaseApiResponse):
    success: bool = False
    error: ErrorDetail


class PaginationParams:
    """Standard pagination parameters dependency."""

    def __init__(
        self,
        skip: int = Query(0, ge=0, description="Offset for pagination"),
        limit: int = Query(50, ge=1, le=500, description="Number of items to return"),
    ):
        self.skip = skip
        self.limit = limit
