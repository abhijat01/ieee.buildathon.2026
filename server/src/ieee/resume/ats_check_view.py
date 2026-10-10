from ieee.api_model import ApiModel
from ieee.resume.keyword_check import KeywordCheck


class AtsCheckView(ApiModel):
    """The check for Applicant Tracking Systems: the keyword groups and the format rules that the resume obeys."""
    keywords: KeywordCheck
    format_checks: list[str]
