from fastapi import Query


class PaginationParams:
    """Standard pagination parameters dependency."""

    def __init__(
        self,
        skip: int = Query(0, ge=0, description="Offset for pagination"),
        limit: int = Query(50, ge=1, le=500, description="Number of items to return"),
    ):
        self.skip = skip
        self.limit = limit
