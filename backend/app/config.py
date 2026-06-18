from pathlib import Path
from pydantic_settings import BaseSettings


def parse_cors_origins(raw: str) -> tuple[list[str], bool]:
    """Parse a comma-separated origins string into (origins, allow_credentials).

    Per the CORS spec, browsers reject credentialed responses when the
    Access-Control-Allow-Origin header is the wildcard "*". So credentials may
    only be enabled when origins are explicit (no wildcard).
    """
    origins = [o.strip() for o in raw.split(",") if o.strip()] or ["*"]
    allow_credentials = origins != ["*"]
    return origins, allow_credentials


class Settings(BaseSettings):
    app_name: str = "Status Monitor"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str = ""
    data_dir: str = ""
    cors_origins: str = "*"
    retention_days: int = 30
    traceroute_timeout: int = 120
    traceroute_max_concurrency: int = 8
    # When set (SM_API_KEY), all /api/v1 routes (except health/auth-status) and
    # the WebSocket require this key. When empty, the API is open (legacy behavior).
    api_key: str = ""

    def get_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        data_dir = Path(self.data_dir) if self.data_dir else Path(__file__).parent.parent / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        db_path = data_dir / "status_monitor.db"
        return f"sqlite+aiosqlite:///{db_path}"

    model_config = {"env_prefix": "SM_", "env_file": ".env", "extra": "ignore"}


settings = Settings()
