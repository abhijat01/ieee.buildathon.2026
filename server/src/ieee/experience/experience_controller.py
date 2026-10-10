from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from ieee.experience.analyze_experience import AnalyzeExperience
from ieee.experience.experience_extraction_exception import ExperienceExtractionException
from ieee.experience.experience_extraction_service import ExperienceExtractionService
from ieee.experience.experience_fields import ExperienceFields
from ieee.experience.experience_service import ExperienceService
from ieee.experience.experience_validation_exception import ExperienceValidationException
from ieee.experience.save_experience import SaveExperience
from ieee.experience.saved_experience import SavedExperience
from ieee.security.authenticated_user import AuthenticatedUser, current_user

SAVE_FAILED = "The experience could not be saved. Your edits remain available. Please retry."


class ExperienceController:
    """Analyzes experience text without storage, and saves reviewed values for the signed-in member."""

    def __init__(self, extraction: ExperienceExtractionService, experiences: ExperienceService):
        self.extraction = extraction
        self.experiences = experiences
        self.router = APIRouter(prefix="/api/experiences")
        self.router.add_api_route("/analyze", self.analyze, methods=["POST"], response_model=ExperienceFields)
        self.router.add_api_route("", self.save, methods=["POST"], response_model=SavedExperience)

    async def analyze(self, request: AnalyzeExperience, user: AuthenticatedUser = Depends(current_user)):
        try:
            return await self.extraction.analyze(request)
        except ExperienceValidationException as exception:
            return self._invalid(exception)
        except ExperienceExtractionException as exception:
            return JSONResponse({"message": exception.message}, status_code=502)

    def save(self, request: SaveExperience, user: AuthenticatedUser = Depends(current_user)):
        try:
            return self.experiences.save(user.subject, request)
        except ExperienceValidationException as exception:
            return self._invalid(exception)
        except SQLAlchemyError:
            return JSONResponse({"message": SAVE_FAILED}, status_code=503)

    @staticmethod
    def _invalid(exception: ExperienceValidationException) -> JSONResponse:
        return JSONResponse({"message": exception.message, "fields": exception.fields}, status_code=400)
