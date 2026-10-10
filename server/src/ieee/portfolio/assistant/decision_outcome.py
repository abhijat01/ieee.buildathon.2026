from enum import Enum


class DecisionOutcome(str, Enum):
    """The decision of the member on one proposal of the assistant."""
    ACCEPTED = "accepted"
    REJECTED = "rejected"
