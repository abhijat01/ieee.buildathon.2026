NOTE = {"title": "Private idea", "body": "Only the owner can read this."}


def test_anonymous_requests_cannot_read_private_data(clients):
    anonymous = clients.anonymous()
    assert anonymous.get("/api/session").status_code == 401
    assert anonymous.get("/api/notes").status_code == 401
    assert anonymous.post("/api/notes", json=NOTE).status_code == 401


def test_session_returns_the_oidc_name_and_csrf_token(clients):
    body = clients.member(name="Abhijat").get("/api/session").json()
    assert body["name"] == "Abhijat"
    assert body["csrfToken"]
    assert body["csrfHeader"] == "X-CSRF-TOKEN"
    assert "agentAvailable" not in body
    assert body["aiAvailable"] is False


def test_csrf_protects_mutations_and_logout(clients):
    member = clients.member(with_csrf=False)
    assert member.post("/api/notes", json=NOTE).status_code == 403
    assert member.post("/api/logout", follow_redirects=False).status_code == 403


def test_logout_accepts_the_form_token_and_clears_the_session(clients):
    member = clients.member()
    token = member.headers.pop("X-CSRF-TOKEN")
    response = member.post("/api/logout", data={"_csrf": token}, follow_redirects=False)
    assert response.status_code == 302
    assert member.get("/api/session").status_code == 401


def test_notes_are_scoped_to_the_authenticated_subject(clients):
    owner = clients.member(subject="owner")
    assert owner.post("/api/notes", json=NOTE).status_code == 200
    notes = owner.get("/api/notes").json()
    assert notes[0]["title"] == "Private idea"
    assert set(notes[0]) == {"id", "title", "body", "createdAt"}
    assert clients.member(subject="other-member").get("/api/notes").json() == []


def test_invalid_notes_are_rejected(clients):
    member = clients.member()
    assert member.post("/api/notes", json={"title": "", "body": "Text"}).status_code == 400
    assert member.post("/api/notes", json={"title": "   ", "body": "Text"}).status_code == 400


def test_removed_agent_and_experience_endpoints_do_not_exist(clients):
    member = clients.member()
    assert member.post("/api/agent", json={}).status_code == 404
    assert member.post("/api/experiences", json={}).status_code == 404
    assert member.post("/api/experiences/analyze", json={}).status_code == 404


def test_login_redirects_to_the_identity_provider(clients, monkeypatch):
    async def metadata(self):
        return {"authorization_endpoint": "http://idp.test/authorize", "issuer": "http://idp.test"}
    from authlib.integrations.starlette_client import StarletteOAuth2App
    monkeypatch.setattr(StarletteOAuth2App, "load_server_metadata", metadata)
    response = clients.anonymous().get("/oauth2/authorization/authentik", follow_redirects=False)
    assert response.status_code == 302
    assert response.headers["location"].startswith("http://idp.test/authorize")
    assert "redirect_uri=http%3A%2F%2Flocalhost%3A5300%2Flogin%2Foauth2%2Fcode%2Fauthentik" in response.headers["location"]
    assert "IEEE02_SESSION=" in response.headers["set-cookie"]
    assert "HttpOnly" in response.headers["set-cookie"]


def test_session_reports_the_ai_as_available_when_the_model_settings_exist(tmp_path):
    from conftest import SignedInClient
    from ieee.config import Settings
    from ieee.database import Database
    from ieee.main import Application
    settings = Settings(database_url=f"sqlite:///{tmp_path}/ai.db", oidc_client_secret="test-secret",
                        azure_openai_endpoint="https://example.test/openai/v1/",
                        azure_openai_deployment="deployment", azure_openai_api_key="private-test-key")
    clients = SignedInClient(Application(settings, Database(settings.database_url)))
    assert clients.member().get("/api/session").json()["aiAvailable"] is True
