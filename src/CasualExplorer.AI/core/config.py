from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_temperature: float = 0.2
    openai_max_tokens: int = 2048

    # Service
    app_name: str = "CasualExplorer AI Service"
    app_version: str = "1.0.0"
    debug: bool = False
    log_level: str = "INFO"

    # CORS
    allowed_origins: list[str] = ["http://localhost:5000", "http://localhost:3000"]


settings = Settings()
