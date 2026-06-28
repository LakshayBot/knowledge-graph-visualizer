# casual-ai-service – Multi-stage Dockerfile
# Build context: repository root

# ── Stage 1: dependency installation ──────────────────────────────────────────
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

FROM base AS builder
COPY casual-ai-service/requirements.txt .
RUN pip install --upgrade pip && \
    pip install --prefix=/install -r requirements.txt

# ── Stage 2: development (used by docker-compose.dev.yml) ─────────────────────
FROM base AS development
COPY --from=builder /install /usr/local
COPY casual-ai-service/ .
EXPOSE 8000 5678
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ── Stage 3: production runtime ───────────────────────────────────────────────
FROM base AS production
COPY --from=builder /install /usr/local
COPY casual-ai-service/ .

# Non-root user
RUN groupadd --system aigroup && useradd --system --gid aigroup aiuser
USER aiuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

# Default target is production
FROM production
