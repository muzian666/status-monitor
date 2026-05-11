import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import health, monitors, results, topology, traceroute, websocket
from app.database import create_tables
from app.services.monitor_scheduler import scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    scheduler.start()
    await scheduler.load_active_monitors()
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(monitors.router, prefix="/api/v1")
app.include_router(results.router, prefix="/api/v1")
app.include_router(topology.router, prefix="/api/v1")
app.include_router(traceroute.router, prefix="/api/v1")
app.include_router(websocket.router, prefix="/api/v1")

static_dir = Path(__file__).parent.parent / "static"
if static_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        file_path = static_dir / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(static_dir / "index.html")
