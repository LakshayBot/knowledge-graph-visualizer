from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from core.config import settings
from core.logging import logger
from routers import causal_analysis, events

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered causal event graph service — OpenAI integration layer",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Prometheus metrics ────────────────────────────────────────────────────────
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(causal_analysis.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")


# ── Lifecycle ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup() -> None:
    logger.info("CausalExplorer AI Service started", version=settings.app_version)


@app.on_event("shutdown")
async def on_shutdown() -> None:
    logger.info("CausalExplorer AI Service shutting down")


# ── Health endpoints ──────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health() -> dict:
    """Liveness probe."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/health/ready", tags=["Health"])
async def readiness() -> dict:
    """Readiness probe."""
    return {"status": "ready", "timestamp": datetime.now(timezone.utc).isoformat()}
