from typing import Callable
from fastapi import APIRouter, Depends, Request
from ieee.api_model import ApiModel
from ieee.security.authenticated_user import AuthenticatedUser, current_user
from ieee.security.csrf import CSRF_HEADER, CsrfTokens


class SessionView(ApiModel):
    name: str
    email: str | None
    csrf_token: str
    csrf_header: str
    agent_available: bool


class SessionController:
    """Returns the signed-in member, the CSRF token, and agent availability."""

    def __init__(self, agent_available: Callable[[], bool]):
        self.agent_available = agent_available
        self.router = APIRouter()
        self.router.add_api_route("/api/session", self.session, methods=["GET"], response_model=SessionView)

    def session(self, request: Request, user: AuthenticatedUser = Depends(current_user)) -> SessionView:
        return SessionView(name=user.name, email=user.email, csrf_token=CsrfTokens.token(request.session),
                           csrf_header=CSRF_HEADER, agent_available=self.agent_available())
