import re
from ieee.portfolio.experience_type import ExperienceType
from ieee.portfolio.portfolio_item_view import PortfolioItemView
from ieee.resume.formatted_resume import FormattedResume
from ieee.resume.keyword_check import KeywordCheck
from ieee.resume.tailored_resume import TailoredResume

CONTACT_LINE = "[Email] | [Phone] | [City] | [LinkedIn]"
SECTIONS = ((ExperienceType.WORK, "Work Experience"), (ExperienceType.PROJECT, "Projects"))
MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
HEADINGS_CHECK = "Standard section headings: Summary, Skills, Work Experience, Projects"
COLUMN_CHECK = "One column. No tables, images, or text boxes"
PLAIN_CHECK = "Plain bullets and plain dates"
KEYWORDS_CHECK = "Job keywords in the Skills section and in the descriptions"
IMAGE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
HTML_TAG = re.compile(r"</?[A-Za-z][^<>]*>")
TABLE_RULE = re.compile(r"^[\s|:-]*-{3,}[\s|:-]*$")
HEADING_MARK = re.compile(r"^\s*#{1,6}\s*")
BULLET_MARK = re.compile(r"^\s*[-*+•]\s+")


class ResumeFormatter:
    """Builds the Markdown resume without the AI. It owns the format rules for Applicant Tracking Systems."""

    def format(self, name: str, tailored: TailoredResume, items: list[PortfolioItemView],
               keywords: KeywordCheck) -> FormattedResume:
        descriptions = {description.item_id: self._plain_text(description.text) for description in tailored.descriptions}
        blocks = [f"# {self._one_line(name)}\n{CONTACT_LINE}"]
        blocks += self._section("Summary", [self._one_line(tailored.summary)])
        blocks += self._section("Skills", [", ".join(self._skills(items, keywords))])
        for experience_type, heading in SECTIONS:
            entries = sorted((item for item in items if item.type is experience_type),
                             key=lambda item: item.start_date or "", reverse=True)
            blocks += self._section(heading, [block for item in entries for block in self._entry(item, descriptions[item.id])])
        checks = [HEADINGS_CHECK, COLUMN_CHECK, PLAIN_CHECK] + ([KEYWORDS_CHECK] if keywords.in_resume else [])
        return FormattedResume("\n\n".join(blocks) + "\n", self._file_name(name), descriptions, checks)

    @staticmethod
    def _section(heading: str, blocks: list[str]) -> list[str]:
        """Omits a section that has no content."""
        content = [block for block in blocks if block]
        return [f"## {heading}", *content] if content else []

    def _entry(self, item: PortfolioItemView, description: str) -> list[str]:
        company = self._one_line(item.company or "")
        heading = f"### {self._one_line(item.title)}" + (f" | {company}" if company else "")
        period = self._period(item)
        return [f"{heading}\n{period}" if period else heading, description]

    @staticmethod
    def _skills(items: list[PortfolioItemView], keywords: KeywordCheck) -> list[str]:
        """The covered job keywords come first. A skill occurs one time. An unsupported keyword never occurs."""
        unsupported = {keyword.casefold() for keyword in keywords.not_in_portfolio}
        skills: dict[str, str] = {}
        for skill in [*keywords.in_resume, *(skill for item in items for skill in item.skills)]:
            if skill.casefold() not in unsupported:
                skills.setdefault(skill.casefold(), skill)
        return list(skills.values())

    @staticmethod
    def _period(item: PortfolioItemView) -> str:
        end = ResumeFormatter._month(item.end_date) if item.end_date else ""
        if not item.start_date:
            return end
        return f"{ResumeFormatter._month(item.start_date)} - {end or 'Present'}"

    @staticmethod
    def _month(date: str) -> str:
        """A plain date: the year, or the short month name and the year."""
        parts = date.split("-")
        return f"{MONTHS[int(parts[1]) - 1]} {parts[0]}" if len(parts) > 1 else parts[0]

    @staticmethod
    def _plain_text(text: str) -> str:
        """Removes tables, images, raw HTML, and headings. Makes each bullet a plain bullet."""
        lines: list[str] = []
        for line in HTML_TAG.sub("", IMAGE.sub("", text)).splitlines():
            if line.lstrip().startswith("|") or TABLE_RULE.match(line):
                continue
            line = BULLET_MARK.sub("- ", HEADING_MARK.sub("", line)).rstrip()
            if line or (lines and lines[-1]):
                lines.append(line)
        return "\n".join(lines).strip()

    @staticmethod
    def _one_line(text: str) -> str:
        """One line of plain text for a name, a title, or the summary."""
        lines = [BULLET_MARK.sub("", line) for line in ResumeFormatter._plain_text(text).splitlines()]
        return " ".join(" ".join(lines).split())

    @staticmethod
    def _file_name(name: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40]
        return f"resume-{slug}.md" if slug else "resume.md"
