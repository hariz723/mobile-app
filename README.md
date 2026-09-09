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

## Quick Start with Makefile

A [`Makefile`](file:///home/hari/projects/mobile-app/Makefile) is provided to streamline common development tasks using your conda environment (`ai312`):

```bash
make help               # Display all available commands
make install            # Install both backend and frontend dependencies
make run-backend        # Run FastAPI backend with uvicorn (http://localhost:8000)
make run-frontend       # Run Vite frontend server (http://localhost:5173)
make build-frontend     # Compile and build frontend assets
make test               # Run test suite with pytest
make docker-up          # Start full stack with Docker Compose
make docker-down        # Stop all Docker Compose services
make docker-logs        # Follow container logs
make clean              # Clean cache and build artifacts
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

---

## Deploying to Vercel

### 1. Frontend on Vercel
The React + TypeScript Vite frontend is configured for deployment on Vercel:
- **Client-Side Routing Rewrites**: Handled by [`vercel.json`](file:///home/hari/projects/mobile-app/vercel.json) and [`frontend/vercel.json`](file:///home/hari/projects/mobile-app/frontend/vercel.json) to prevent 404s on page refresh.
- **Environment Variables**:
  Configure these in your Vercel Project Settings under **Settings > Environment Variables**:
  | Variable | Example Value | Description |
  | :--- | :--- | :--- |
  | `VITE_API_BASE_URL` | `https://api.yourdomain.com/api` | Public URL to your backend REST API |
  | `VITE_WS_BASE_URL` | `wss://api.yourdomain.com` | Public URL to your backend WebSocket server |

### 2. Deployment Options
#### Option A: Vercel Dashboard (GitHub Import)
1. Push your repository to GitHub.
2. In Vercel, click **Add New > Project** and import the repository.
3. If deploying from the repository root:
   - **Root Directory**: `frontend` (or leave as root; the root `vercel.json` will build `frontend/`).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the environment variables above and click **Deploy**.

#### Option B: Vercel CLI
```bash
cd frontend
vercel
```

### 3. Backend & Persistent WebSockets Note
> [!IMPORTANT]
> **Why the Backend needs a persistent host**:
> Vercel Serverless Functions have execution timeouts and do not support long-lived persistent WebSocket connections (`/ws/admin/locations`).
> For production:
> - **Frontend**: Hosted on **Vercel** (CDN Edge).
> - **Backend (FastAPI)**: Hosted on a container or process service with persistent WebSocket support (e.g. **Railway**, **Render**, **Fly.io**, or **Docker Compose** on a Linux VPS).
> - **PostgreSQL**: Cloud managed (Neon, Supabase, Railway Postgres, or Render Postgres).
> - **Redis**: Upstash Redis or Redis Cloud.
> - **Backend CORS**: Add your Vercel frontend URL to `ALLOWED_ORIGINS` in the backend environment.

