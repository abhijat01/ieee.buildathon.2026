import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from ieee.config import Settings, settings
from ieee.database import Database
from ieee.azure_chat_client import AzureChatClientFactory
from ieee.portfolio.assistant.assistant_tools import AssistantTools
from ieee.portfolio.assistant.member_thread_store import MemberThreadStore
from ieee.portfolio.assistant.portfolio_assistant_controller import PortfolioAssistantController
from ieee.portfolio.assistant.portfolio_assistant_factory import PortfolioAssistantFactory
from ieee.portfolio.assistant.portfolio_assistant_instructions import PortfolioAssistantInstructions
from ieee.portfolio.assistant.portfolio_assistant_service import PortfolioAssistantService
from ieee.portfolio.duplicate_search_service import DuplicateSearchService
from ieee.portfolio.experience_ai_error import ExperienceAiError
from ieee.portfolio.experience_analysis_service import ExperienceAnalysisService
from ieee.portfolio.experience_extractor import ExperienceExtractor
from ieee.portfolio.experience_improver import ExperienceImprover
from ieee.portfolio.extraction_instructions import ExtractionInstructions
from ieee.portfolio.improvement_instructions import ImprovementInstructions
from ieee.portfolio.portfolio_controller import PortfolioController
from ieee.portfolio.portfolio_service import PortfolioService
from ieee.portfolio.portfolio_validation_error import PortfolioValidationError
from ieee.resume.description_tailor import DescriptionTailor
from ieee.resume.job_analysis_service import JobAnalysisService
from ieee.resume.job_analyst import JobAnalyst
from ieee.resume.job_analyst_instructions import JobAnalystInstructions
from ieee.resume.keyword_check_service import KeywordCheckService
from ieee.resume.portfolio_prompt import PortfolioPrompt
from ieee.resume.resume_controller import ResumeController
from ieee.resume.resume_formatter import ResumeFormatter
from ieee.resume.resume_validation_error import ResumeValidationError
from ieee.resume.resume_writer_service import ResumeWriterService
from ieee.resume.tailor_instructions import TailorInstructions
from ieee.resume.tailored_resume_check import TailoredResumeCheck
from ieee.security.csrf import CsrfMiddleware
from ieee.security.oidc_controller import OidcController
from ieee.security.session_controller import SessionController
from ieee.security.session_store import ServerSessionMiddleware, SessionStore
from ieee.workspace.workspace_controller import WorkspaceController
from ieee.workspace.workspace_service import WorkspaceService


class Application:
    """Composes services, controllers, and middleware. Tests may replace any service before build()."""

    def __init__(self, config: Settings, database: Database | None = None):
        self.settings = config
        self.database = database or Database(config.database_url)
        self.models = AzureChatClientFactory(config)
        self.workspace = WorkspaceService(self.database)
        self.portfolio = PortfolioService(self.database)
        self.duplicates = DuplicateSearchService(self.database)
        self.extractor = ExperienceExtractor(self.models, ExtractionInstructions())
        self.improver = ExperienceImprover(self.models, ImprovementInstructions())
        self.assistant = PortfolioAssistantService(
            self.portfolio, self.models, PortfolioAssistantFactory(PortfolioAssistantInstructions()),
            AssistantTools(), MemberThreadStore())
        self.job_analyst = JobAnalyst(self.models, JobAnalystInstructions(), PortfolioPrompt())
        self.tailor = DescriptionTailor(self.models, TailorInstructions(), PortfolioPrompt())
        self.sessions = SessionStore(config.session_timeout_seconds)

    def build(self) -> FastAPI:
        self.database.migrate()
        app = FastAPI(title="IEEE Workspace", docs_url=None, redoc_url=None, openapi_url=None)
        analysis = ExperienceAnalysisService(self.extractor, self.duplicates)
        for controller in (OidcController(self.settings), SessionController(self.models.configured),
                           WorkspaceController(self.workspace),
                           PortfolioController(self.portfolio, analysis, self.improver),
                           PortfolioAssistantController(self.assistant), self._resume_controller()):
            app.include_router(controller.router)
        app.add_exception_handler(ResumeValidationError, self._rule_error)
        app.add_exception_handler(RequestValidationError, self._invalid_request)
        app.add_exception_handler(ValueError, self._invalid_request)
        app.add_exception_handler(HTTPException, self._http_error)
        app.add_exception_handler(PortfolioValidationError, self._rule_error)
        app.add_exception_handler(ExperienceAiError, self._ai_error)
        app.add_middleware(CsrfMiddleware)
        app.add_middleware(ServerSessionMiddleware, store=self.sessions,
                           cookie_name=self.settings.session_cookie_name, secure=self.settings.cookie_secure)
        app.router.on_shutdown.append(self.assistant.close)
        return app

    def _resume_controller(self) -> ResumeController:
        keywords = KeywordCheckService()
        writer = ResumeWriterService(self.portfolio, keywords, self.tailor, TailoredResumeCheck(keywords),
                                     ResumeFormatter())
        return ResumeController(JobAnalysisService(self.portfolio, self.job_analyst), writer)

    @staticmethod
    async def _invalid_request(request: Request, exception: Exception) -> JSONResponse:
        return JSONResponse({"message": "The request is invalid."}, status_code=400)

    @staticmethod
    async def _http_error(request: Request, exception: HTTPException) -> JSONResponse:
        return JSONResponse({"message": exception.detail}, status_code=exception.status_code)

    @staticmethod
    async def _rule_error(request: Request, exception: PortfolioValidationError | ResumeValidationError) -> JSONResponse:
        return JSONResponse({"message": str(exception)}, status_code=400)

    @staticmethod
    async def _ai_error(request: Request, exception: ExperienceAiError) -> JSONResponse:
        return JSONResponse({"message": str(exception)}, status_code=503)


def create_app() -> FastAPI:
    logging.basicConfig(level=logging.INFO)
    return Application(settings()).build()
