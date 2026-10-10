from ieee.api_model import ApiModel
from ieee.experience.experience_fields import ExperienceFields
from ieee.experience.experience_type import ExperienceTypeInput


class SaveExperience(ApiModel):
    type: ExperienceTypeInput = None
    original_input: str | None = None
    company: str | None = None
    project_name: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None

    def fields(self) -> ExperienceFields:
        return ExperienceFields(company=self.company, project_name=self.project_name, start_date=self.start_date,
                                end_date=self.end_date, description=self.description)
