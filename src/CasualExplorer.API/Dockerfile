# CasualExplorer.API – Multi-stage Dockerfile
# Build context: repository root (docker compose build context: .)

# ── Stage 1: restore + build (also used as the dev watch stage) ───────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /repo

ENV PATH="${PATH}:/root/.dotnet/tools"

# The setup script uses this SDK stage for EF Core migrations when the host
# does not have the required .NET/PostgreSQL tooling installed.
RUN dotnet tool install --global dotnet-ef --version 8.0.0

# Copy csproj files first so NuGet restore is cached as a separate layer.
# All four projects are copied together so that ProjectReference chains are
# fully resolved during restore (prevents NETSDK1064 on transitive analyzer packages).
COPY src/CasualExplorer.Domain/CasualExplorer.Domain.csproj             src/CasualExplorer.Domain/
COPY src/CasualExplorer.Application/CasualExplorer.Application.csproj   src/CasualExplorer.Application/
COPY src/CasualExplorer.Infrastructure/CasualExplorer.Infrastructure.csproj src/CasualExplorer.Infrastructure/
COPY src/CasualExplorer.API/CasualExplorer.API.csproj                   src/CasualExplorer.API/

# Restore via the API project — dotnet restore walks the full ProjectReference
# graph so all transitive packages land in the NuGet cache.
RUN dotnet restore src/CasualExplorer.API/CasualExplorer.API.csproj \
      --locked-mode false

# Copy the full source and build (restore is skipped automatically because
# the packages are already in the cache from the step above).
COPY src/ src/

WORKDIR /repo/src/CasualExplorer.API
RUN dotnet build CasualExplorer.API.csproj -c Release

# ── Stage 2: publish ──────────────────────────────────────────────────────────
FROM build AS publish
RUN dotnet publish CasualExplorer.API.csproj \
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
# Pre-create key ring directory with correct ownership (for Data Protection persistence)
RUN mkdir -p /app/keys && chown appuser:appgroup /app/keys
USER appuser

COPY --from=publish /app/publish .

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -q --spider http://localhost:5001/health/live || exit 1

ENTRYPOINT ["dotnet", "CasualExplorer.API.dll"]
