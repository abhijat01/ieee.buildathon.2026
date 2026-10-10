from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Server settings. Environment variables override the defaults."""
    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    app_profile: str = "sample-app-02"
    app_origin: str = "http://localhost:5300"
    server_port: int = 8300
    cookie_secure: bool = False
    session_cookie_name: str = "IEEE02_SESSION"
    session_timeout_seconds: int = 1800
    oidc_issuer: str = "http://localhost:9010/application/o/sample-app-02/"
    oidc_client_id: str = "sample-app-02"
    oidc_client_secret: str = ""
    database_url: str = "sqlite:///./.runtime/ieee.db"
    azure_openai_endpoint: str = ""
    azure_openai_deployment: str = ""
    azure_openai_api_key: str = ""

    def agent_configured(self) -> bool:
        return bool(self.azure_openai_endpoint and self.azure_openai_deployment and self.azure_openai_api_key)


@lru_cache
def settings() -> Settings:
    return Settings()
