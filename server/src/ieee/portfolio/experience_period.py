import re
from dataclasses import dataclass
from ieee.portfolio.portfolio_validation_error import PortfolioValidationError

DATE_PATTERN = r"^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$"
DATE_FORMAT_MESSAGE = "Use the date format YYYY, YYYY-MM, or YYYY-MM-DD."
DATE_ORDER_MESSAGE = "The start date must not be after the end date."
OPEN_END = "9999-12-31"


@dataclass(frozen=True)
class ExperiencePeriod:
    """The start date and the end date of an experience. An empty end date means current work."""
    start: str | None
    end: str | None

    @staticmethod
    def parse(start: str | None, end: str | None) -> "ExperiencePeriod":
        period = ExperiencePeriod((start or "").strip() or None, (end or "").strip() or None)
        for value in (period.start, period.end):
            if value and not re.match(DATE_PATTERN, value):
                raise PortfolioValidationError(DATE_FORMAT_MESSAGE)
        if period.start and period.end and period._first_day() > period._last_day():
            raise PortfolioValidationError(DATE_ORDER_MESSAGE)
        return period

    def overlaps(self, other: "ExperiencePeriod") -> bool:
        if not self.start or not other.start:
            return False
        return self._first_day() <= other._last_day() and other._first_day() <= self._last_day()

    def _first_day(self) -> str:
        return self.start + "-01-01"[len(self.start) - 4:]

    def _last_day(self) -> str:
        return self.end + "-12-31"[len(self.end) - 4:] if self.end else OPEN_END
