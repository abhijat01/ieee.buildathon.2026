from enum import StrEnum
from typing import Annotated, Any
from pydantic import BeforeValidator


class ExperienceType(StrEnum):
    PROJECT = "PROJECT"
    PROFESSIONAL = "PROFESSIONAL"

    @staticmethod
    def parse(value: Any) -> "ExperienceType | None":
        """Returns None for a missing or unknown type. The validator reports it as a field error."""
        if isinstance(value, ExperienceType):
            return value
        if isinstance(value, str) and value in ExperienceType.__members__:
            return ExperienceType(value)
        return None


ExperienceTypeInput = Annotated[ExperienceType | None, BeforeValidator(ExperienceType.parse)]
