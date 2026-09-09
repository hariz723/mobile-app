from typing import Generic, Optional, TypeVar, Any
from pydantic import BaseModel

DataT = TypeVar("DataT")


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None


class BaseApiResponse(BaseModel):
    success: bool = True


class ApiResponse(BaseApiResponse, Generic[DataT]):
    data: Optional[DataT] = None
    message: Optional[str] = None


class ErrorResponse(BaseApiResponse):
    success: bool = False
    error: ErrorDetail
