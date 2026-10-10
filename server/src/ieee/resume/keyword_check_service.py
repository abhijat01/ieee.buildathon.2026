import re
from ieee.portfolio.portfolio_item_view import PortfolioItemView
from ieee.resume.keyword_check import KeywordCheck


class KeywordCheckService:
    """Sorts the job keywords by the portfolio facts. It owns the rule for a keyword match."""

    def check(self, keywords: list[str], included: list[PortfolioItemView],
              excluded: list[PortfolioItemView]) -> KeywordCheck:
        """Matches each keyword against the title, the text, and the skills of the items, never against AI text."""
        check = KeywordCheck(in_resume=[], in_excluded_items=[], not_in_portfolio=[])
        for keyword in self._unique(keywords):
            if self._in_items(keyword, included):
                check.in_resume.append(keyword)
            elif self._in_items(keyword, excluded):
                check.in_excluded_items.append(keyword)
            else:
                check.not_in_portfolio.append(keyword)
        return check

    def contains(self, text: str, keyword: str) -> bool:
        """The match rule: the full keyword on word limits. The letter case has no effect. A plural is a different word."""
        words = [re.escape(word) for word in keyword.split()]
        if not words:
            return False
        return re.search(r"(?<!\w)" + r"\s+".join(words) + r"(?!\w)", text, re.IGNORECASE) is not None

    def _in_items(self, keyword: str, items: list[PortfolioItemView]) -> bool:
        return any(self.contains("\n".join([item.title, item.text, *item.skills]), keyword) for item in items)

    @staticmethod
    def _unique(keywords: list[str]) -> list[str]:
        unique: dict[str, str] = {}
        for keyword in keywords:
            if keyword.strip():
                unique.setdefault(keyword.strip().casefold(), keyword.strip())
        return list(unique.values())
