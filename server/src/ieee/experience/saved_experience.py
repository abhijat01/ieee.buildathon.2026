from datetime import datetime
from ieee.api_model import ApiModel
from ieee.experience.experience_type import ExperienceType


class SavedExperience(ApiModel):
    id: str
    type: ExperienceType
    original_input: str
    company: str | None
    project_name: str | None
    start_date: str | None
    end_date: str | None
    description: str | None
    created_at: datetime
