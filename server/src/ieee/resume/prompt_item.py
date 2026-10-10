from ieee.api_model import ApiModel
from ieee.portfolio.experience_type import ExperienceType
from ieee.portfolio.portfolio_item_view import PortfolioItemView


class PromptItem(ApiModel):
    """The fields of one portfolio item that the agent receives. It holds no owner and no storage date."""
    id: str
    type: ExperienceType
    title: str
    company: str | None
    start_date: str | None
    end_date: str | None
    skills: list[str]
    text: str

    @staticmethod
    def of(item: PortfolioItemView, text_length: int) -> "PromptItem":
        return PromptItem(id=item.id, type=item.type, title=item.title, company=item.company,
                          start_date=item.start_date, end_date=item.end_date, skills=item.skills,
                          text=item.text[:text_length])
