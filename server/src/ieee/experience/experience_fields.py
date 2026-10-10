from ieee.api_model import ApiModel


class ExperienceFields(ApiModel):
    """The reviewable fields of one experience."""
    company: str | None = None
    project_name: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None
