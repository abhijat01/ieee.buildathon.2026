import logging
from ieee.portfolio.experience_ai_error import ExperienceAiError
from ieee.portfolio.portfolio_item_view import PortfolioItemView
from ieee.resume.keyword_check import KeywordCheck
from ieee.resume.keyword_check_service import KeywordCheckService
from ieee.resume.resume_limits import DESCRIPTION_LENGTH
from ieee.resume.tailored_resume import TailoredResume

logger = logging.getLogger(__name__)


class TailoredResumeCheck:
    """The server rule that protects the facts. It rejects AI texts that the portfolio does not support."""

    def __init__(self, keywords: KeywordCheckService):
        self.keywords = keywords

    def check(self, tailored: TailoredResume, included: list[PortfolioItemView], keyword_check: KeywordCheck) -> None:
        """Raises ExperienceAiError when the AI result does not agree with the included items."""
        expected = sorted(item.id for item in included)
        if sorted(description.item_id for description in tailored.descriptions) != expected:
            self._reject("The AI result has a missing, unknown, or repeated item identifier.")
        texts = [tailored.summary, *(description.text for description in tailored.descriptions)]
        if any(not text.strip() or len(text) > DESCRIPTION_LENGTH for text in texts):
            self._reject("The AI result has a text with an invalid length.")
        for keyword in keyword_check.unsupported():
            if any(self.keywords.contains(text, keyword) for text in texts):
                self._reject("The AI result uses a keyword that the included items do not support.")

    @staticmethod
    def _reject(reason: str) -> None:
        logger.warning(reason)
        raise ExperienceAiError()
