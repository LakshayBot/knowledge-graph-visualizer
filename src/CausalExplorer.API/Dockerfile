# CausalExplorer.API – Multi-stage Dockerfile
# Build context: repository root (docker compose build context: .)

# ── Stage 1: restore + build (also used as the dev watch stage) ───────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /repo

# Copy csproj files first so NuGet restore is cached as a separate layer.
# All four projects are copied together so that ProjectReference chains are
# fully resolved during restore (prevents NETSDK1064 on transitive analyzer packages).
COPY src/CausalExplorer.Domain/CausalExplorer.Domain.csproj             src/CausalExplorer.Domain/
COPY src/CausalExplorer.Application/CausalExplorer.Application.csproj   src/CausalExplorer.Application/
COPY src/CausalExplorer.Infrastructure/CausalExplorer.Infrastructure.csproj src/CausalExplorer.Infrastructure/
COPY src/CausalExplorer.API/CausalExplorer.API.csproj                   src/CausalExplorer.API/

# Restore via the API project — dotnet restore walks the full ProjectReference
# graph so all transitive packages land in the NuGet cache.
RUN dotnet restore src/CausalExplorer.API/CausalExplorer.API.csproj \
      --locked-mode false

# Copy the full source and build (restore is skipped automatically because
# the packages are already in the cache from the step above).
COPY src/ src/

WORKDIR /repo/src/CausalExplorer.API
RUN dotnet build CausalExplorer.API.csproj -c Release

# ── Stage 2: publish ──────────────────────────────────────────────────────────
FROM build AS publish
RUN dotnet publish CausalExplorer.API.csproj \
      -c Release \
      --no-build \
      -o /app/publish \
      /p:UseAppHost=false

# ── Stage 3: runtime image ────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Install wget for the health-check probe (aspnet image uses Debian)
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser
USER appuser

COPY --from=publish /app/publish .

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -q --spider http://localhost:5001/health/live || exit 1

ENTRYPOINT ["dotnet", "CausalExplorer.API.dll"]
