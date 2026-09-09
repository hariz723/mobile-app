from starlette.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Test that root endpoint returns welcome message and docs URL."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "version" in data
    assert data["docs_url"] == "/api/docs"


def test_health_check_endpoints(client: TestClient):
    """Test both /health and /api/health endpoints."""
    # Global health
    res1 = client.get("/health")
    assert res1.status_code == 200
    assert res1.json()["status"] == "healthy"

    # API v1 health
    res2 = client.get("/api/health")
    assert res2.status_code == 200
    body = res2.json()
    assert body["success"] is True
    assert body["data"]["status"] == "healthy"
    assert "timestamp" in body["data"]
    assert "app_name" in body["data"]


def test_response_process_time_header(client: TestClient):
    """Test that X-Process-Time header is included in responses."""
    response = client.get("/health")
    assert "x-process-time" in response.headers
    assert response.headers["x-process-time"].endswith("ms")


def test_not_found_exception_handling(client: TestClient):
    """Test that 404 errors return the standardized JSON structure."""
    response = client.get("/api/non-existent-path")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "message" in data["error"]


def test_openapi_schema(client: TestClient):
    """Test that OpenAPI schema and documentation paths are working."""
    response = client.get("/api/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "openapi" in schema
    assert schema["info"]["title"] == "Consent-Based Real-Time Location Sharing"
