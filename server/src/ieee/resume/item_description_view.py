from ieee.api_model import ApiModel


class ItemDescriptionView(ApiModel):
    """The two versions of one item description: the portfolio text and the text in the resume."""
    item_id: str
    title: str
    company: str | None
    original_text: str
    improved_text: str
