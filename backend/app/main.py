import logging
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import auth, health, monitors, results, topology, traceroute, websocket
from app.config import parse_cors_origins, settings
from app.database import migrate_database
from app.services.monitor_scheduler import scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

cors_origins, allow_credentials = parse_cors_origins(settings.cors_origins)

# Paths exempt from API-key auth: health probes and the auth-status probe.
_PUBLIC_API_PREFIXES = ("/api/v1/health", "/api/v1/auth/status")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await migrate_database()
    scheduler.start()
    await scheduler.load_active_monitors()
    scheduler.schedule_retention(settings.retention_days)
    logger.info("Status Monitor started")
    yield
    scheduler.shutdown()
    logger.info("Status Monitor stopped")


app = FastAPI(
    title="Status Monitor",
    description="Network Connectivity Monitoring API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def enforce_api_key(request: Request, call_next):
    """When SM_API_KEY is set, require X-API-Key on protected /api/v1 routes.

    Opt-in: with no key configured the API stays open (backwards compatible).
    """
    path = request.url.path
    if (
        settings.api_key
        and request.method != "OPTIONS"  # let CORS preflight through
        and path.startswith("/api/v1/")
        and not path.startswith(_PUBLIC_API_PREFIXES)
    ):
        provided = request.headers.get("X-API-Key", "")
        if not secrets.compare_digest(provided, settings.api_key):
            return JSONResponse(
                {"detail": "Invalid or missing API key"}, status_code=401
            )
    return await call_next(request)

# Register WebSocket FIRST so it has priority over catch-all routes
app.include_router(websocket.router, prefix="/api/v1")

app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(monitors.router, prefix="/api/v1")
app.include_router(results.router, prefix="/api/v1")
app.include_router(topology.router, prefix="/api/v1")
app.include_router(traceroute.router, prefix="/api/v1")

static_dir = Path(__file__).parent.parent / "static"
if static_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        file_path = static_dir / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(static_dir / "index.html")
