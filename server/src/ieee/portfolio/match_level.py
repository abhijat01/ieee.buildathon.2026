from enum import Enum


class MatchLevel(str, Enum):
    """How similar an existing portfolio item is to a new experience."""
    VERY_SIMILAR = "VERY_SIMILAR"
    SOME_OVERLAP = "SOME_OVERLAP"
