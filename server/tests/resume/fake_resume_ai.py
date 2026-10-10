from ieee.portfolio.experience_ai_error import ExperienceAiError
from ieee.portfolio.portfolio_item_view import PortfolioItemView
from ieee.resume.job_analysis import JobAnalysis
from ieee.resume.keyword_check import KeywordCheck
from ieee.resume.relevance_level import RelevanceLevel
from ieee.resume.tailored_resume import TailoredResume
from .resume_samples import job_analysis, review, tailored


class FakeJobAnalyst:
    """Replaces JobAnalyst. It reviews each item that it receives, or returns the given result, or fails."""

    def __init__(self, result: JobAnalysis | None = None, fail: bool = False):
        self.result = result
        self.fail = fail
        self.received: list[list[PortfolioItemView]] = []

    async def analyze(self, job_text: str, items: list[PortfolioItemView]) -> JobAnalysis:
        self.received.append(items)
        if self.fail:
            raise ExperienceAiError()
        return self.result or job_analysis([review(item.id, RelevanceLevel.HIGH) for item in items])


class FakeTailor:
    """Replaces DescriptionTailor. It writes one bullet for each item, or returns the given result, or fails."""

    def __init__(self, result: TailoredResume | None = None, fail: bool = False):
        self.result = result
        self.fail = fail
        self.received: list[list[PortfolioItemView]] = []
        self.keyword_checks: list[KeywordCheck] = []

    async def tailor(self, job_text: str, keywords: KeywordCheck, items: list[PortfolioItemView]) -> TailoredResume:
        self.received.append(items)
        self.keyword_checks.append(keywords)
        if self.fail:
            raise ExperienceAiError()
        return self.result or tailored({item.id: f"- Improved text of {item.title}" for item in items})
