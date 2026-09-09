# Consent-Based Real-Time Location Sharing System Makefile
.DEFAULT_GOAL := help

SHELL := /bin/bash
CONDA_ENV ?= ai312
CONDA_RUN := conda run -n $(CONDA_ENV)

# Directories
BACKEND_DIR := backend
FRONTEND_DIR := frontend

.PHONY: help
help: ## Display this help message
	@echo "========================================================================"
	@echo " Consent-Based Real-Time Location Sharing - Commands"
	@echo " (Using Conda Environment: $(CONDA_ENV))"
	@echo "========================================================================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

## Environment & Dependencies
.PHONY: install
install: install-backend install-frontend ## Install both backend and frontend dependencies

.PHONY: install-backend
install-backend: ## Install backend dependencies into conda environment
	@echo "Installing backend dependencies in $(CONDA_ENV)..."
	$(CONDA_RUN) pip install -r $(BACKEND_DIR)/requirements.txt

.PHONY: install-frontend
install-frontend: ## Install frontend npm dependencies
	@echo "Installing frontend dependencies..."
	cd $(FRONTEND_DIR) && npm install

## Development Servers
.PHONY: run-backend
run-backend: ## Run FastAPI backend development server
	@echo "Starting FastAPI backend on http://0.0.0.0:8000..."
	cd $(BACKEND_DIR) && $(CONDA_RUN) uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

.PHONY: run-frontend
run-frontend: ## Run Vite frontend development server
	@echo "Starting Vite frontend on http://localhost:5173..."
	cd $(FRONTEND_DIR) && npm run dev

.PHONY: build-frontend
build-frontend: ## Build frontend production assets with TypeScript and Vite
	@echo "Building frontend bundle..."
	cd $(FRONTEND_DIR) && npm run build

## Testing & Quality
.PHONY: test
test: test-backend ## Run backend and frontend tests

.PHONY: test-backend
test-backend: ## Run backend unit/integration tests with pytest
	@echo "Running backend test suite with pytest..."
	cd $(BACKEND_DIR) && $(CONDA_RUN) pytest -v tests/

.PHONY: lint
lint: lint-backend lint-frontend ## Run linters for both backend (ruff) and frontend (eslint)

.PHONY: lint-backend
lint-backend: ## Lint backend code using ruff
	@echo "Linting backend Python code with ruff..."
	cd $(BACKEND_DIR) && $(CONDA_RUN) ruff check .

.PHONY: lint-frontend
lint-frontend: ## Lint frontend code using ESLint
	@echo "Linting frontend TypeScript/React code with ESLint..."
	cd $(FRONTEND_DIR) && npm run lint

.PHONY: format
format: format-backend format-frontend ## Auto-format backend and frontend code

.PHONY: format-backend
format-backend: ## Auto-format backend Python code with ruff
	@echo "Formatting backend code with ruff..."
	cd $(BACKEND_DIR) && $(CONDA_RUN) ruff check --fix . && $(CONDA_RUN) ruff format .

.PHONY: format-frontend
format-frontend: ## Auto-format frontend code with ESLint
	@echo "Fixing frontend lint issues with ESLint..."
	cd $(FRONTEND_DIR) && npm run lint:fix

## Database & Migrations
.PHONY: db-migrate
db-migrate: ## Run Alembic database migrations to head
	@echo "Applying Alembic database migrations..."
	cd $(BACKEND_DIR) && $(CONDA_RUN) alembic upgrade head

.PHONY: db-rollback
db-rollback: ## Rollback last Alembic migration
	@echo "Rolling back last database migration..."
	cd $(BACKEND_DIR) && $(CONDA_RUN) alembic downgrade -1

## Docker Compose
.PHONY: docker-up
docker-up: ## Start full stack using Docker Compose in detached mode
	@echo "Spinning up Docker Compose services (frontend, backend, postgres, redis)..."
	docker compose up --build -d

.PHONY: docker-down
docker-down: ## Stop all Docker Compose containers
	@echo "Stopping Docker Compose services..."
	docker compose down

.PHONY: docker-logs
docker-logs: ## Follow Docker Compose logs
	docker compose logs -f

.PHONY: docker-ps
docker-ps: ## List running Docker Compose services
	docker compose ps

## Cleanup
.PHONY: clean
clean: ## Remove build artifacts, caches, and temp files
	@echo "Cleaning up Python and Node caches..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	rm -rf $(FRONTEND_DIR)/dist 2>/dev/null || true
	@echo "Clean completed."
