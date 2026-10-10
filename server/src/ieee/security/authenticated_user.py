from dataclasses import dataclass
from fastapi import HTTPException, Request, status

USER_KEY = "user"


@dataclass(frozen=True)
class AuthenticatedUser:
    subject: str
    name: str
    email: str | None

    @staticmethod
    def from_claims(claims: dict) -> "AuthenticatedUser":
        name = claims.get("name") or claims.get("preferred_username") or "Member"
        return AuthenticatedUser(subject=str(claims["sub"]), name=str(name), email=claims.get("email"))


def current_user(request: Request) -> AuthenticatedUser:
    """FastAPI dependency. Returns the signed-in member or raises HTTP 401."""
    data = request.session.get(USER_KEY)
    if not data:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in to continue.")
    return AuthenticatedUser(**data)
