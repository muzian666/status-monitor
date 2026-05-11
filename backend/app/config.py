from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Status Monitor"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str = ""
    data_dir: str = ""

    def get_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        data_dir = Path(self.data_dir) if self.data_dir else Path(__file__).parent.parent / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        db_path = data_dir / "status_monitor.db"
        return f"sqlite+aiosqlite:///{db_path}"

    model_config = {"env_prefix": "SM_", "env_file": ".env", "extra": "ignore"}


settings = Settings()
