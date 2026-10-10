import pytest
from sqlalchemy import select
from ieee.portfolio.experience_ai_error import ExperienceAiError
from ieee.portfolio.portfolio_item import PortfolioItem
from ieee.portfolio.portfolio_item_not_found import PortfolioItemNotFound
from ieee.portfolio.portfolio_service import PortfolioService
from ieee.resume.keyword_check_service import KeywordCheckService
from ieee.resume.resume_formatter import ResumeFormatter
from ieee.resume.resume_writer_service import ResumeWriterService
from ieee.resume.tailored_resume_check import TailoredResumeCheck
from ieee.resume.write_resume_request import WriteResumeRequest
from .fake_resume_ai import FakeTailor
from .resume_samples import ATLAS_TEXT, JOB_KEYWORDS, JOB_TEXT, save_atlas, save_northwind, tailored


@pytest.fixture
def portfolio(database) -> PortfolioService:
    return PortfolioService(database)


def writer(portfolio: PortfolioService, tailor: FakeTailor) -> ResumeWriterService:
    keywords = KeywordCheckService()
    return ResumeWriterService(portfolio, keywords, tailor, TailoredResumeCheck(keywords), ResumeFormatter())


def request(item_ids: list[str]) -> WriteResumeRequest:
    return WriteResumeRequest(job_text=JOB_TEXT, keywords=JOB_KEYWORDS, item_ids=item_ids)


def stored_rows(database) -> list[tuple]:
    with database.session() as session:
        return sorted((row.id, row.title, row.original_text, row.final_text, tuple(row.skills))
                      for row in session.scalars(select(PortfolioItem)))


async def test_the_resume_uses_only_the_included_items_and_the_portfolio_rows_stay_unchanged(portfolio, database):
    atlas, northwind = save_atlas(portfolio), save_northwind(portfolio)
    before = stored_rows(database)
    tailor = FakeTailor(tailored({atlas.id: "- Built the data pipeline with Python and PostgreSQL"}))
    resume = await writer(portfolio, tailor).write("owner", "Abhijat", request([atlas.id]))
    assert [[item.id for item in items] for items in tailor.received] == [[atlas.id]]
    assert "Atlas analytics dashboard | Acme Corp" in resume.markdown
    assert "Northwind" not in resume.markdown and "## Work Experience" not in resume.markdown
    assert resume.markdown.startswith("# Abhijat\n") and resume.file_name == "resume-abhijat.md"
    assert [(view.item_id, view.title, view.original_text, view.improved_text) for view in resume.descriptions] == [
        (atlas.id, "Atlas analytics dashboard", ATLAS_TEXT, "- Built the data pipeline with Python and PostgreSQL")]
    assert stored_rows(database) == before


async def test_the_ats_check_uses_the_portfolio_facts_and_the_tailor_receives_it(portfolio):
    atlas, northwind = save_atlas(portfolio), save_northwind(portfolio)
    tailor = FakeTailor()
    resume = await writer(portfolio, tailor).write("owner", "Abhijat", request([atlas.id]))
    keywords = resume.ats_check.keywords
    assert (keywords.in_resume, keywords.in_excluded_items, keywords.not_in_portfolio) == (
        ["Python", "React"], ["Kubernetes"], ["SQL", "AWS"])
    assert tailor.keyword_checks == [keywords]
    assert "## Skills\n\nPython, React\n" in resume.markdown
    assert len(resume.ats_check.format_checks) == 4


async def test_an_item_of_a_different_owner_or_an_unknown_item_is_not_found(portfolio):
    mine, other = save_atlas(portfolio, "owner"), save_northwind(portfolio, "other-member")
    tailor = FakeTailor()
    for item_ids in ([mine.id, other.id], [mine.id, "unknown-id"]):
        with pytest.raises(PortfolioItemNotFound):
            await writer(portfolio, tailor).write("owner", "Abhijat", request(item_ids))
    assert tailor.received == []


async def test_an_ai_failure_and_an_unsupported_keyword_give_the_ai_error(portfolio):
    atlas = save_atlas(portfolio)
    with pytest.raises(ExperienceAiError):
        await writer(portfolio, FakeTailor(fail=True)).write("owner", "Abhijat", request([atlas.id]))
    save_northwind(portfolio)
    for text in ("- Ran the pipeline on AWS", "- Ran the pipeline on Kubernetes"):
        with pytest.raises(ExperienceAiError, match="The AI could not write the resume. Your selection is safe."):
            await writer(portfolio, FakeTailor(tailored({atlas.id: text}))).write("owner", "Abhijat", request([atlas.id]))
