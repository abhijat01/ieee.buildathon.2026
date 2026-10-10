import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from ieee.config import Settings, settings
from ieee.database import Database
from ieee.azure_chat_client import AzureChatClientFactory
from ieee.security.csrf import CsrfMiddleware
from ieee.security.oidc_controller import OidcController
from ieee.security.session_controller import SessionController
from ieee.security.session_store import ServerSessionMiddleware, SessionStore
from ieee.workspace.workspace_controller import WorkspaceController
from ieee.workspace.workspace_service import WorkspaceService
from ieee.agent.agent_controller import AgentController
from ieee.agent.agent_service import AgentService
from ieee.experience.experience_controller import ExperienceController
from ieee.experience.experience_extraction_service import ExperienceExtractionService
from ieee.experience.experience_service import ExperienceService
from ieee.experience.experience_validator import ExperienceValidator


class Application:
    """Composes services, controllers, and middleware. Tests may replace any service before build()."""

    def __init__(self, config: Settings, database: Database | None = None):
        self.settings = config
        self.database = database or Database(config.database_url)
        self.models = AzureChatClientFactory(config)
        self.workspace = WorkspaceService(self.database)
        self.agent = AgentService(config, self.workspace, self.models)
        validator = ExperienceValidator()
        self.extraction = ExperienceExtractionService(validator, self.models)
        self.experiences = ExperienceService(self.database, validator)
        self.sessions = SessionStore(config.session_timeout_seconds)

    def build(self) -> FastAPI:
        self.database.migrate()
        app = FastAPI(title="IEEE Workspace", docs_url=None, redoc_url=None, openapi_url=None)
        for controller in (OidcController(self.settings), SessionController(self.agent.available),
                           WorkspaceController(self.workspace), AgentController(self.agent),
                           ExperienceController(self.extraction, self.experiences)):
            app.include_router(controller.router)
        app.add_exception_handler(RequestValidationError, self._invalid_request)
        app.add_exception_handler(ValueError, self._invalid_request)
        app.add_exception_handler(HTTPException, self._http_error)
        app.add_middleware(CsrfMiddleware)
        app.add_middleware(ServerSessionMiddleware, store=self.sessions,
                           cookie_name=self.settings.session_cookie_name, secure=self.settings.cookie_secure)
        app.router.on_shutdown.append(self.agent.close)
        return app

    @staticmethod
    async def _invalid_request(request: Request, exception: Exception) -> JSONResponse:
        return JSONResponse({"message": "The request is invalid."}, status_code=400)

    @staticmethod
    async def _http_error(request: Request, exception: HTTPException) -> JSONResponse:
        return JSONResponse({"message": exception.detail}, status_code=exception.status_code)


def create_app() -> FastAPI:
    logging.basicConfig(level=logging.INFO)
    return Application(settings()).build()
