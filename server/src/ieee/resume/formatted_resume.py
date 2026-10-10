from dataclasses import dataclass


@dataclass(frozen=True)
class FormattedResume:
    """The result of the formatter: the Markdown, the file name, the clean descriptions, and the format checks."""
    markdown: str
    file_name: str
    descriptions: dict[str, str]
    format_checks: list[str]
