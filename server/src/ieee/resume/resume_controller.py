from fastapi import APIRouter, Depends, HTTPException, status
from ieee.portfolio.portfolio_item_not_found import PortfolioItemNotFound
from ieee.resume.analyze_job_request import AnalyzeJobRequest
from ieee.resume.job_analysis_service import JobAnalysisService
from ieee.resume.job_analysis_view import JobAnalysisView
from ieee.resume.resume_view import ResumeView
from ieee.resume.resume_writer_service import ResumeWriterService
from ieee.resume.write_resume_request import WriteResumeRequest
from ieee.security.authenticated_user import AuthenticatedUser, current_user


class ResumeController:
    """HTTP routes for the resume builder. Each route uses the signed-in member as the owner."""

    def __init__(self, analysis: JobAnalysisService, writer: ResumeWriterService):
        self.analysis = analysis
        self.writer = writer
        self.router = APIRouter(prefix="/api/resume")
        self.router.add_api_route("/analyze", self.analyze, methods=["POST"], response_model=JobAnalysisView)
        self.router.add_api_route("/write", self.write, methods=["POST"], response_model=ResumeView)

    async def analyze(self, request: AnalyzeJobRequest,
                      user: AuthenticatedUser = Depends(current_user)) -> JobAnalysisView:
        return await self.analysis.analyze(user.subject, request.job_text)

    async def write(self, request: WriteResumeRequest, user: AuthenticatedUser = Depends(current_user)) -> ResumeView:
        try:
            return await self.writer.write(user.subject, user.name, request)
        except PortfolioItemNotFound:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "The portfolio item does not exist.") from None
