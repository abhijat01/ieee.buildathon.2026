from fastapi import APIRouter, Depends, HTTPException, status
from ieee.portfolio.analysis_view import AnalysisView
from ieee.portfolio.analyze_request import AnalyzeRequest
from ieee.portfolio.experience_analysis_service import ExperienceAnalysisService
from ieee.portfolio.experience_improver import ExperienceImprover
from ieee.portfolio.improve_request import ImproveRequest
from ieee.portfolio.improved_text import ImprovedText
from ieee.portfolio.portfolio_item_not_found import PortfolioItemNotFound
from ieee.portfolio.portfolio_item_view import PortfolioItemView
from ieee.portfolio.portfolio_service import PortfolioService
from ieee.portfolio.save_item_request import SaveItemRequest
from ieee.portfolio.update_item_request import UpdateItemRequest
from ieee.security.authenticated_user import AuthenticatedUser, current_user

NOT_FOUND_MESSAGE = "The portfolio item does not exist."


class PortfolioController:
    """HTTP routes for the portfolio. Each route uses the signed-in member as the owner."""

    def __init__(self, portfolio: PortfolioService, analysis: ExperienceAnalysisService, improver: ExperienceImprover):
        self.portfolio = portfolio
        self.analysis = analysis
        self.improver = improver
        self.router = APIRouter(prefix="/api/portfolio")
        self.router.add_api_route("", self.list, methods=["GET"], response_model=list[PortfolioItemView])
        self.router.add_api_route("", self.save, methods=["POST"], response_model=PortfolioItemView)
        self.router.add_api_route("/analyze", self.analyze, methods=["POST"], response_model=AnalysisView)
        self.router.add_api_route("/improve", self.improve, methods=["POST"], response_model=ImprovedText)
        self.router.add_api_route("/{item_id}", self.get, methods=["GET"], response_model=PortfolioItemView)
        self.router.add_api_route("/{item_id}", self.update, methods=["PUT"], response_model=PortfolioItemView)

    def list(self, user: AuthenticatedUser = Depends(current_user)) -> list[PortfolioItemView]:
        return self.portfolio.list_items(user.subject)

    def get(self, item_id: str, user: AuthenticatedUser = Depends(current_user)) -> PortfolioItemView:
        try:
            return self.portfolio.get_item(user.subject, item_id)
        except PortfolioItemNotFound:
            raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND_MESSAGE) from None

    def save(self, request: SaveItemRequest, user: AuthenticatedUser = Depends(current_user)) -> PortfolioItemView:
        return self.portfolio.save_item(user.subject, request)

    def update(self, item_id: str, request: UpdateItemRequest,
               user: AuthenticatedUser = Depends(current_user)) -> PortfolioItemView:
        try:
            return self.portfolio.update_item(user.subject, item_id, request)
        except PortfolioItemNotFound:
            raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND_MESSAGE) from None

    async def analyze(self, request: AnalyzeRequest, user: AuthenticatedUser = Depends(current_user)) -> AnalysisView:
        return await self.analysis.analyze(user.subject, request.text)

    async def improve(self, request: ImproveRequest, user: AuthenticatedUser = Depends(current_user)) -> ImprovedText:
        return await self.improver.improve(request.text, request.instruction)
