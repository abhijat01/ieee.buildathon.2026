from ieee.api_model import ApiModel
from ieee.portfolio.duplicate_match import DuplicateMatch
from ieee.portfolio.extracted_fields import ExtractedFields


class AnalysisView(ApiModel):
    """The result of one analysis: the extracted fields and the possible duplicates."""
    fields: ExtractedFields
    duplicates: list[DuplicateMatch]
