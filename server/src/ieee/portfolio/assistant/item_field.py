from enum import Enum


class ItemField(str, Enum):
    """A field of a portfolio item that the assistant can propose to change."""
    TITLE = "title"
    TYPE = "type"
    COMPANY = "company"
    START_DATE = "startDate"
    END_DATE = "endDate"
