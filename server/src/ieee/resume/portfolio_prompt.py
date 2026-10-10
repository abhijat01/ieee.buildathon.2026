import json
from ieee.portfolio.portfolio_item_view import PortfolioItemView
from ieee.resume.keyword_check import KeywordCheck
from ieee.resume.prompt_item import PromptItem
from ieee.resume.resume_limits import ANALYSIS_TEXT_LENGTH, DESCRIPTION_LENGTH


class PortfolioPrompt:
    """Builds the user message for the resume agents. JSON keeps the member data apart from the instructions."""

    def analysis_message(self, job_text: str, items: list[PortfolioItemView]) -> str:
        """The message for the job analysis. It shortens each item text to the analysis limit."""
        return self._message({"jobDescription": job_text}, items, ANALYSIS_TEXT_LENGTH)

    def tailor_message(self, job_text: str, keywords: KeywordCheck, items: list[PortfolioItemView]) -> str:
        """The message for the resume texts. It sends the full text of each included item."""
        head = {"jobDescription": job_text, "keywords": keywords.in_resume,
                "unsupportedKeywords": keywords.unsupported()}
        return self._message(head, items, DESCRIPTION_LENGTH)

    @staticmethod
    def _message(head: dict[str, object], items: list[PortfolioItemView], text_length: int) -> str:
        prompt_items = [PromptItem.of(item, text_length).model_dump(mode="json") for item in items]
        return json.dumps({**head, "portfolioItems": prompt_items}, ensure_ascii=False)
