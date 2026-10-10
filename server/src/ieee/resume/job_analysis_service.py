import asyncio
import logging
from ieee.portfolio.experience_ai_error import ExperienceAiError
from ieee.portfolio.portfolio_item_view import PortfolioItemView
from ieee.portfolio.portfolio_service import PortfolioService
from ieee.resume.item_review import ItemReview
from ieee.resume.item_review_view import ItemReviewView
from ieee.resume.job_analysis import JobAnalysis
from ieee.resume.job_analysis_view import JobAnalysisView
from ieee.resume.job_analyst import JobAnalyst
from ieee.resume.relevance_level import RelevanceLevel
from ieee.resume.resume_validation_error import ResumeValidationError

logger = logging.getLogger(__name__)
EMPTY_PORTFOLIO_MESSAGE = "Your portfolio is empty. Add an experience first."
AI_MESSAGE = "The AI could not analyze the job description. Your text is safe. Try again."
PROPOSED_LEVELS = (RelevanceLevel.HIGH, RelevanceLevel.MEDIUM)
LEVEL_ORDER = [RelevanceLevel.HIGH, RelevanceLevel.MEDIUM, RelevanceLevel.LOW]


class JobAnalysisService:
    """Analyzes a job description against the portfolio of one owner. It stores nothing."""

    def __init__(self, portfolio: PortfolioService, analyst: JobAnalyst):
        self.portfolio = portfolio
        self.analyst = analyst

    async def analyze(self, owner: str, job_text: str) -> JobAnalysisView:
        items = await asyncio.to_thread(self.portfolio.list_items, owner)
        if not items:
            raise ResumeValidationError(EMPTY_PORTFOLIO_MESSAGE)
        try:
            analysis = await self.analyst.analyze(job_text, items)
            reviews = self._reviews_by_item(analysis, items)
        except ExperienceAiError:
            raise ExperienceAiError(AI_MESSAGE) from None
        views = [self._view(item, reviews[item.id]) for item in items]
        views.sort(key=lambda view: LEVEL_ORDER.index(view.relevance))
        return JobAnalysisView(job_title=analysis.job_title.strip(), company=(analysis.company or "").strip() or None,
                               requirements=self._clean(analysis.requirements), keywords=self._clean(analysis.keywords),
                               items=views)

    @staticmethod
    def _reviews_by_item(analysis: JobAnalysis, items: list[PortfolioItemView]) -> dict[str, ItemReview]:
        """Model output is untrusted. The result must have exactly one review for each item of the owner."""
        reviewed = sorted(review.item_id for review in analysis.reviews)
        if reviewed != sorted(item.id for item in items):
            logger.warning("The AI result has a missing, unknown, or repeated item identifier.")
            raise ExperienceAiError()
        return {review.item_id: review for review in analysis.reviews}

    def _view(self, item: PortfolioItemView, review: ItemReview) -> ItemReviewView:
        return ItemReviewView(item_id=item.id, type=item.type, title=item.title, company=item.company,
                              start_date=item.start_date, end_date=item.end_date, relevance=review.relevance,
                              reason=review.reason.strip(), matched_keywords=self._clean(review.matched_keywords),
                              proposed=review.relevance in PROPOSED_LEVELS)

    @staticmethod
    def _clean(values: list[str]) -> list[str]:
        """Removes empty and repeated values. Keeps the order of the AI."""
        unique: dict[str, str] = {}
        for value in values:
            if value.strip():
                unique.setdefault(value.strip().casefold(), value.strip())
        return list(unique.values())
