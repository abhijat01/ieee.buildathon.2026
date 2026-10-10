import asyncio
from ieee.portfolio.experience_ai_error import ExperienceAiError
from ieee.portfolio.portfolio_item_view import PortfolioItemView
from ieee.portfolio.portfolio_service import PortfolioService
from ieee.resume.ats_check_view import AtsCheckView
from ieee.resume.description_tailor import DescriptionTailor
from ieee.resume.item_description_view import ItemDescriptionView
from ieee.resume.keyword_check_service import KeywordCheckService
from ieee.resume.resume_formatter import ResumeFormatter
from ieee.resume.resume_view import ResumeView
from ieee.resume.tailored_resume_check import TailoredResumeCheck
from ieee.resume.write_resume_request import WriteResumeRequest

AI_MESSAGE = "The AI could not write the resume. Your selection is safe. Try again."


class ResumeWriterService:
    """Writes a resume for one job from the included portfolio items of one owner. It stores nothing."""

    def __init__(self, portfolio: PortfolioService, keywords: KeywordCheckService, tailor: DescriptionTailor,
                 resume_check: TailoredResumeCheck, formatter: ResumeFormatter):
        self.portfolio = portfolio
        self.keywords = keywords
        self.tailor = tailor
        self.resume_check = resume_check
        self.formatter = formatter

    async def write(self, owner: str, name: str, request: WriteResumeRequest) -> ResumeView:
        """Raises PortfolioItemNotFound when an identifier is not an item of the owner."""
        included, excluded = await asyncio.to_thread(self._items, owner, request.item_ids)
        keyword_check = self.keywords.check(request.keywords, included, excluded)
        try:
            tailored = await self.tailor.tailor(request.job_text, keyword_check, included)
            self.resume_check.check(tailored, included, keyword_check)
        except ExperienceAiError:
            raise ExperienceAiError(AI_MESSAGE) from None
        resume = self.formatter.format(name, tailored, included, keyword_check)
        descriptions = [ItemDescriptionView(item_id=item.id, title=item.title, company=item.company,
                                            original_text=item.text, improved_text=resume.descriptions[item.id])
                        for item in included]
        return ResumeView(markdown=resume.markdown, file_name=resume.file_name, descriptions=descriptions,
                          ats_check=AtsCheckView(keywords=keyword_check, format_checks=resume.format_checks))

    def _items(self, owner: str, item_ids: list[str]) -> tuple[list[PortfolioItemView], list[PortfolioItemView]]:
        """Reads the included items and the other items of the owner."""
        included = self.portfolio.get_items(owner, item_ids)
        included_ids = {item.id for item in included}
        excluded = [item for item in self.portfolio.list_items(owner) if item.id not in included_ids]
        return included, excluded
