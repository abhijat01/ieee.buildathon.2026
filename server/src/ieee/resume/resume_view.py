from ieee.api_model import ApiModel
from ieee.resume.ats_check_view import AtsCheckView
from ieee.resume.item_description_view import ItemDescriptionView


class ResumeView(ApiModel):
    """The resume for one job, as the UI shows it. The server does not store it."""
    markdown: str
    file_name: str
    descriptions: list[ItemDescriptionView]
    ats_check: AtsCheckView
