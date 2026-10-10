from enum import Enum


class RelevanceLevel(str, Enum):
    """How well one portfolio item fits the job description."""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
