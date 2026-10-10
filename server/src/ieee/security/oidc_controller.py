from urllib.parse import urlencode
from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from ieee.config import Settings
from ieee.security.authenticated_user import USER_KEY, AuthenticatedUser
from ieee.security.session_store import ROTATE_KEY

ID_TOKEN_KEY = "id_token"


class OidcController:
    """OIDC login with authentik. Tokens stay in the server-side session."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.oauth = OAuth()
        self.oauth.register(
            name="authentik",
            client_id=settings.oidc_client_id,
            client_secret=settings.oidc_client_secret,
            server_metadata_url=settings.oidc_issuer.rstrip("/") + "/.well-known/openid-configuration",
            client_kwargs={"scope": "openid profile email", "code_challenge_method": "S256"},
        )
        self.router = APIRouter()
        self.router.add_api_route("/oauth2/authorization/authentik", self.login, methods=["GET"])
        self.router.add_api_route("/login/oauth2/code/authentik", self.callback, methods=["GET"])
        self.router.add_api_route("/api/logout", self.logout, methods=["POST"])

    @property
    def redirect_uri(self) -> str:
        return self.settings.app_origin + "/login/oauth2/code/authentik"

    async def login(self, request: Request):
        return await self.oauth.authentik.authorize_redirect(request, self.redirect_uri)

    async def callback(self, request: Request):
        try:
            token = await self.oauth.authentik.authorize_access_token(request)
        except OAuthError:
            return RedirectResponse(self.settings.app_origin + "/?error", status_code=302)
        user = AuthenticatedUser.from_claims(token["userinfo"])
        request.session.clear()
        request.session[ROTATE_KEY] = True
        request.session[USER_KEY] = user.__dict__
        request.session[ID_TOKEN_KEY] = token.get("id_token")
        return RedirectResponse(self.settings.app_origin + "/", status_code=302)

    async def logout(self, request: Request):
        id_token = request.session.get(ID_TOKEN_KEY)
        request.session.clear()
        target = self.settings.app_origin + "/"
        try:
            metadata = await self.oauth.authentik.load_server_metadata()
            end_session = metadata.get("end_session_endpoint")
        except Exception:
            end_session = None
        if end_session:
            query = {"post_logout_redirect_uri": target}
            if id_token:
                query["id_token_hint"] = id_token
            target = end_session + "?" + urlencode(query)
        return RedirectResponse(target, status_code=302)
