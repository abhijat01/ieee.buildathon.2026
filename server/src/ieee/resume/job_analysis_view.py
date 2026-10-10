from ieee.api_model import ApiModel
from ieee.resume.item_review_view import ItemReviewView


class JobAnalysisView(ApiModel):
    """The needs of the job and the review of each portfolio item, as the UI shows them."""
    job_title: str
    company: str | None
    requirements: list[str]
    keywords: list[str]
    items: list[ItemReviewView]
