import secrets
import pytest
from fastapi.testclient import TestClient
from ieee.config import Settings
from ieee.database import Database
from ieee.main import Application
from ieee.security.authenticated_user import USER_KEY
from ieee.security.csrf import CSRF_HEADER, CSRF_SESSION_KEY


class SignedInClient:
    """Creates test clients with a server-side session for a given subject."""

    def __init__(self, application: Application):
        self.application = application
        self.app = application.build()

    def anonymous(self) -> TestClient:
        return TestClient(self.app)

    def member(self, subject: str = "member-a", name: str = "Abhijat", with_csrf: bool = True) -> TestClient:
        session_id, token = secrets.token_urlsafe(16), secrets.token_urlsafe(16)
        self.application.sessions.save(session_id, {
            USER_KEY: {"subject": subject, "name": name, "email": f"{subject}@example.test"},
            CSRF_SESSION_KEY: token})
        client = TestClient(self.app, cookies={self.application.settings.session_cookie_name: session_id})
        if with_csrf:
            client.headers[CSRF_HEADER] = token
        return client


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(database_url=f"sqlite:///{tmp_path}/test.db", oidc_client_secret="test-secret",
                    azure_openai_endpoint="", azure_openai_deployment="", azure_openai_api_key="")


@pytest.fixture
def clients(settings) -> SignedInClient:
    return SignedInClient(Application(settings, Database(settings.database_url)))
