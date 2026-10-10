from pydantic import BaseModel, Field
from ieee.portfolio.assistant.item_field import ItemField
from ieee.portfolio.portfolio_limits import NAME_LENGTH

REASON_LENGTH = 200


class FieldChange(BaseModel):
    """One proposed new value for one field of the experience."""
    field: ItemField = Field(description="The field to change.")
    value: str = Field(max_length=NAME_LENGTH, description=(
        "The new value. For type, use PROJECT or WORK. For startDate and endDate, use the format YYYY-MM. "
        "An empty endDate means current work."))
    reason: str = Field(max_length=REASON_LENGTH, description="One short sentence that says why. Name the source.")
