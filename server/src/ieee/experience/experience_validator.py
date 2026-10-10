import calendar
import re
from datetime import date
from ieee.experience.experience_fields import ExperienceFields
from ieee.experience.experience_type import ExperienceType
from ieee.experience.experience_validation_exception import ExperienceValidationException

INPUT_LIMIT = 4000
NAME_LIMIT = 160
DESCRIPTION_LIMIT = 4000
DATE_PATTERN = re.compile(r"[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?")
DATE_MESSAGE = "Use a valid YYYY, YYYY-MM, or YYYY-MM-DD date."


class ExperienceValidator:
    """Business rules for experience input and reviewed fields."""

    def input(self, type: ExperienceType | None, value: str | None) -> str | None:
        errors: dict[str, str] = {}
        if type is None:
            errors["type"] = "Choose an experience type."
        text = self._clean(value)
        if text is None or self._length(text) > INPUT_LIMIT:
            errors["originalInput"] = "Enter 1–4,000 characters."
        self._reject(errors)
        return text

    def fields(self, value: ExperienceFields, save: bool) -> ExperienceFields:
        errors: dict[str, str] = {}
        company = self._text(value.company, NAME_LIMIT, "company", errors)
        project = self._text(value.project_name, NAME_LIMIT, "projectName", errors)
        description = self._text(value.description, DESCRIPTION_LIMIT, "description", errors)
        start, end = self._clean(value.start_date), self._clean(value.end_date)
        starts, ends = self._date(start, "startDate", errors), self._date(end, "endDate", errors)
        if starts is not None and ends is not None and ends[1] < starts[0]:
            errors["endDate"] = "The end date precedes the start date."
        if save and company is None and project is None:
            errors["company"] = "Enter a company or project name."
        if save and description is None:
            errors["description"] = "Enter a description."
        self._reject(errors)
        return ExperienceFields(company=company, project_name=project, start_date=start, end_date=end,
                                description=description)

    def _text(self, value: str | None, limit: int, field: str, errors: dict[str, str]) -> str | None:
        text = self._clean(value)
        if text is not None and self._length(text) > limit:
            errors[field] = f"Use at most {limit} characters."
        return text

    @staticmethod
    def _date(value: str | None, field: str, errors: dict[str, str]) -> tuple[date, date] | None:
        """Returns the first and last day that the date can mean, at its precision."""
        if value is None:
            return None
        try:
            if not DATE_PATTERN.fullmatch(value) or value.startswith("0000"):
                raise ValueError(value)
            year = int(value[0:4])
            if len(value) == 4:
                return date(year, 1, 1), date(year, 12, 31)
            month = int(value[5:7])
            if len(value) == 7:
                return date(year, month, 1), date(year, month, calendar.monthrange(year, month)[1])
            day = date.fromisoformat(value)
            return day, day
        except (ValueError, calendar.IllegalMonthError):
            errors[field] = DATE_MESSAGE
            return None

    @staticmethod
    def _clean(value: str | None) -> str | None:
        return None if value is None or value.isspace() or value == "" else value.strip()

    @staticmethod
    def _length(text: str) -> int:
        """Counts UTF-16 code units, the same as the browser `maxLength` check."""
        return len(text.encode("utf-16-le")) // 2

    @staticmethod
    def _reject(errors: dict[str, str]) -> None:
        if errors:
            raise ExperienceValidationException(errors)
