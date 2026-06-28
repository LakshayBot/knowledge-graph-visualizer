# Contributing to CasualExplorer

Thank you for your interest in contributing.

## Development Setup

### Prerequisites

- .NET 8 SDK
- Python 3.12+
- Docker & Docker Compose
- PostgreSQL 16 (or use the Docker Compose stack)

### Running locally

```bash
# Start PostgreSQL
docker compose -f docker/docker-compose.dev.yml up postgres -d

# Run the .NET API
cd src/CasualExplorer.API
dotnet run

# Run the Python AI service
cd src/CasualExplorer.AI
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in OPENAI_API_KEY
uvicorn main:app --reload
```

## Coding Standards

### .NET

- Follow Clean Architecture layer separation strictly.
- All public members must have XML documentation comments.
- Domain entities must use factory methods (`Create(...)`) and private setters.
- No data annotations on domain entities.
- Every business operation must raise the appropriate domain event.
- Handlers must never access the DbContext directly — only through `IUnitOfWork`.
- Use `Result<T>` / `Result` for all application-layer return types.
- Add a FluentValidation validator for every command.

### Python

- Follow PEP 8.
- All endpoints must have Pydantic request/response models.
- All AI calls must be async.
- Use `structlog` for logging; never use `print()`.

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `develop` | Integration branch |
| `feat/*` | New features |
| `fix/*` | Bug fixes |
| `chore/*` | Tooling, dependency updates |

## Pull Request Checklist

- [ ] All existing tests pass (`dotnet test`)
- [ ] New behaviour is covered by unit tests
- [ ] XML docs added for all new public members
- [ ] No warnings introduced
- [ ] Docker images build cleanly

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(domain): add FreshnessScore recalculation to EventNode
fix(api): return 404 when event node not found in verify endpoint
chore: upgrade Npgsql to 8.0.1
```
