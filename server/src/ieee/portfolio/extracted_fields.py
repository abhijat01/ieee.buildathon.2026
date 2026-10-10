from pydantic import Field
from ieee.api_model import ApiModel
from ieee.portfolio.experience_period import DATE_PATTERN
from ieee.portfolio.experience_type import ExperienceType
from ieee.portfolio.portfolio_limits import NAME_LENGTH, SKILL_COUNT, SKILL_LENGTH

DATE_HELP = "Use YYYY, YYYY-MM, or YYYY-MM-DD with the precision of the text. Use null when the text gives no date."


class ExtractedFields(ApiModel):
    """The fields that the AI extracts from one experience. The model reads the descriptions."""
    title: str = Field(description="A short title for the experience, such as the project name or the job title.")
    type: ExperienceType = Field(description="PROJECT for one project. WORK for a job or a role at an employer.")
    company: str | None = Field(description="The company or organization that the text names. Null when the text names none.")
    start_date: str | None = Field(pattern=DATE_PATTERN, description="The start date. " + DATE_HELP)
    end_date: str | None = Field(pattern=DATE_PATTERN,
                                 description="The end date. Null for current work. " + DATE_HELP)
    skills: list[str] = Field(description="The skills, tools, and technologies that the text names. At most 10 short items.")

    def within_limits(self) -> "ExtractedFields":
        """Returns a copy that obeys the storage limits. Model output is untrusted."""
        skills = [skill.strip()[:SKILL_LENGTH] for skill in self.skills if skill.strip()][:SKILL_COUNT]
        company = (self.company or "").strip()[:NAME_LENGTH] or None
        return self.model_copy(update={"title": self.title.strip()[:NAME_LENGTH], "company": company, "skills": skills})
