from typing import Annotated
from pydantic import AfterValidator, Field
from ieee.api_model import ApiModel
from ieee.resume.max_length import MaxLength
from ieee.resume.resume_limits import DESCRIPTION_LENGTH, ITEM_ID_LENGTH


class ImprovedDescription(ApiModel):
    """The description of one portfolio item, as the AI wrote it for the job. The model reads the descriptions."""
    item_id: Annotated[str, AfterValidator(MaxLength(ITEM_ID_LENGTH))] = Field(
        description="The id of the portfolio item, copied exactly from the input.")
    text: Annotated[str, AfterValidator(MaxLength(DESCRIPTION_LENGTH))] = Field(
        description="Two to five Markdown bullets that start with '- '. They contain only facts from the item text.")
