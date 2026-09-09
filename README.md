# Consent-Based Real-Time Location Sharing System

A privacy-first, full-stack real-time location sharing platform. Users explicitly control when and how their location is shared. Authorized administrators can view live user locations and location history through a Leaflet map.

---

## Key Privacy Principles
- **No Secret Tracking**: Location collection only begins upon explicit user consent and action.
- **Immediate Termination**: When a user stops location collection, tracking ceases instantly.
- **Configurable Retention**: Location history is retained strictly according to policy and user consent.
- **Role-Based Access Control**: Only authorized administrators can view specific user locations.
- **Comprehensive Audit Logging**: All sensitive administrative views and actions are logged.

---

## Tech Stack
- **Backend**: Python 3.12, FastAPI, SQLAlchemy, PostgreSQL, Alembic, Redis, WebSockets, Pydantic v2
- **Frontend**: React, TypeScript, Vite, React Leaflet, OpenStreetMap, Axios
- **Infrastructure**: Docker, Docker Compose

---

## Phase 1: FastAPI Project Setup

### Project Structure (Phase 1)
```text
mobile-app/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── api_v1.py
│   │   │   └── health.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── exceptions.py
│   │   │   └── dependencies.py
│   │   └── schemas/
│   │       ├── __init__.py
│   │       ├── common.py
│   │       └── health.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   └── test_main.py
│   ├── .env
│   ├── .env.example
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml
├── .env
├── .env.example
└── README.md
```

---

## Running the Application Locally

### Using Conda Environment (`ai312`)

1. **Activate the environment**:
   ```bash
   conda activate ai312
   ```

2. **Navigate to the backend directory and install dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Run the FastAPI development server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   Or run directly with conda:
   ```bash
   conda run -n ai312 uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Access the API**:
   - **Root**: [http://localhost:8000/](http://localhost:8000/)
   - **Health Check**: [http://localhost:8000/health](http://localhost:8000/health) or [http://localhost:8000/api/health](http://localhost:8000/api/health)
   - **Interactive API Docs (Swagger UI)**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
   - **ReDoc**: [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)

---

## Running Tests

Run the test suite using `pytest`:
```bash
cd backend
conda run -n ai312 pytest -v
```

---

## Running with Docker Compose

Run all services (Backend, PostgreSQL, Redis):
```bash
docker compose up --build
```
