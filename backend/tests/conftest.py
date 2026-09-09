import sys
from pathlib import Path
import pytest
from starlette.testclient import TestClient

# Ensure backend root is in sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.main import app


@pytest.fixture(scope="session")
def client():
    """Provides a synchronous FastAPI TestClient."""
    with TestClient(app) as test_client:
        yield test_client
