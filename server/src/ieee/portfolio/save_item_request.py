from pydantic import Field
from ieee.portfolio.portfolio_limits import TEXT_LENGTH
from ieee.portfolio.update_item_request import UpdateItemRequest


class SaveItemRequest(UpdateItemRequest):
    """A new portfolio item that the member approved. It adds the original text to the item values."""
    original_text: str = Field(max_length=TEXT_LENGTH)
