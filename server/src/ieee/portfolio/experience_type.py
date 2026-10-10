from enum import Enum


class ExperienceType(str, Enum):
    """The kind of a portfolio item."""
    PROJECT = "PROJECT"
    WORK = "WORK"
