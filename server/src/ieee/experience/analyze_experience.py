from ieee.api_model import ApiModel
from ieee.experience.experience_type import ExperienceTypeInput


class AnalyzeExperience(ApiModel):
    type: ExperienceTypeInput = None
    original_input: str | None = None
