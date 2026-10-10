from pydantic import BaseModel, Field
from ieee.portfolio.assistant.field_change import FieldChange
from ieee.portfolio.assistant.item_field import ItemField


class ProposeFieldsArguments(BaseModel):
    """The parameters of the proposeFields tool."""
    changes: list[FieldChange] = Field(min_length=1, max_length=len(ItemField), description=(
        "The proposed field changes. Give at most one change for each field."))
