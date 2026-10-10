from ieee.portfolio.experience_ai_error import ExperienceAiError
from ieee.portfolio.extracted_fields import ExtractedFields
from ieee.portfolio.improved_text import ImprovedText
from .portfolio_samples import atlas_fields


class FakeExtractor:
    """Replaces ExperienceExtractor. It returns fixed fields or fails."""

    def __init__(self, fail: bool = False):
        self.fail = fail
        self.texts: list[str] = []

    async def extract(self, text: str) -> ExtractedFields:
        self.texts.append(text)
        if self.fail:
            raise ExperienceAiError()
        return atlas_fields()


class FakeImprover:
    """Replaces ExperienceImprover. It returns a fixed proposal or fails."""

    def __init__(self, fail: bool = False):
        self.fail = fail
        self.instructions: list[str] = []

    async def improve(self, text: str, instruction: str) -> ImprovedText:
        self.instructions.append(instruction)
        if self.fail:
            raise ExperienceAiError()
        return ImprovedText(text="Improved: " + text, note="I used active verbs.")
