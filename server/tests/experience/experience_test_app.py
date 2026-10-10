from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from ieee.database import Database
from ieee.experience.experience_controller import ExperienceController
from ieee.experience.experience_extraction_service import ExperienceExtractionService
from ieee.experience.experience_service import ExperienceService
from ieee.experience.experience_validator import ExperienceValidator
from ieee.security.authenticated_user import USER_KEY
from ieee.security.csrf import CSRF_HEADER, CSRF_SESSION_KEY, CsrfMiddleware
from ieee.security.session_store import ServerSessionMiddleware, SessionStore

COOKIE = "TEST_SESSION"
CSRF_TOKEN = "test-csrf-token"


class ExperienceTestApp:
    """Builds the experience routes with the shared session and CSRF security, like main.Application."""

    def __init__(self, database: Database, extraction: ExperienceExtractionService):
        self.database = database
        self.sessions = SessionStore(1800)
        validator = ExperienceValidator()
        app = FastAPI()
        app.include_router(ExperienceController(extraction, ExperienceService(database, validator)).router)
        app.add_exception_handler(RequestValidationError, self._invalid_request)
        app.add_exception_handler(HTTPException, self._http_error)
        app.add_middleware(CsrfMiddleware)
        app.add_middleware(ServerSessionMiddleware, store=self.sessions, cookie_name=COOKIE, secure=False)
        self.app = app

    def client(self, subject: str | None = "member", csrf: bool = True) -> TestClient:
        """A client with a server session. subject=None gives an anonymous session."""
        client = TestClient(self.app)
        data: dict = {}
        if subject is not None:
            data[USER_KEY] = {"subject": subject, "name": "Member", "email": None}
        if csrf:
            data[CSRF_SESSION_KEY] = CSRF_TOKEN
            client.headers[CSRF_HEADER] = CSRF_TOKEN
        if data:
            session_id = f"session-{subject}-{csrf}"
            self.sessions.save(session_id, data)
            client.cookies.set(COOKIE, session_id)
        return client

    @staticmethod
    async def _invalid_request(request: Request, exception: Exception) -> JSONResponse:
        return JSONResponse({"message": "The request is invalid."}, status_code=400)

    @staticmethod
    async def _http_error(request: Request, exception: HTTPException) -> JSONResponse:
        return JSONResponse({"message": exception.detail}, status_code=exception.status_code)
