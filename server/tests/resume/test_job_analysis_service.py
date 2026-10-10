import json
import pytest
from ieee.portfolio.experience_ai_error import ExperienceAiError
from ieee.portfolio.portfolio_service import PortfolioService
from ieee.resume.job_analysis_service import JobAnalysisService
from ieee.resume.portfolio_prompt import PortfolioPrompt
from ieee.resume.relevance_level import RelevanceLevel
from ieee.resume.resume_limits import ANALYSIS_TEXT_LENGTH, ITEM_COUNT, JOB_TEXT_LENGTH
from ieee.resume.resume_validation_error import ResumeValidationError
from .fake_resume_ai import FakeJobAnalyst
from .resume_samples import JOB_TEXT, item_view, job_analysis, review, save_atlas, save_northwind


@pytest.fixture
def portfolio(database) -> PortfolioService:
    return PortfolioService(database)


async def test_proposes_the_high_and_medium_items_and_lists_the_best_items_first(portfolio):
    low, medium, high = save_atlas(portfolio), save_northwind(portfolio), save_atlas(portfolio)
    analyst = FakeJobAnalyst(job_analysis([review(low.id, RelevanceLevel.LOW), review(medium.id, RelevanceLevel.MEDIUM),
                                           review(high.id, RelevanceLevel.HIGH)]))
    analysis = await JobAnalysisService(portfolio, analyst).analyze("owner", JOB_TEXT)
    assert [(view.item_id, view.relevance, view.proposed) for view in analysis.items] == [
        (high.id, RelevanceLevel.HIGH, True), (medium.id, RelevanceLevel.MEDIUM, True), (low.id, RelevanceLevel.LOW, False)]
    assert (analysis.job_title, analysis.company) == ("Senior Full-Stack Engineer", "Contoso Analytics")
    assert analysis.keywords == ["Python", "SQL", "React", "Kubernetes", "AWS"]
    assert (analysis.items[1].title, analysis.items[1].company) == ("Senior Software Engineer", "Northwind Labs")
    assert analysis.items[0].matched_keywords == ["Python"]


async def test_an_empty_portfolio_is_rejected_before_the_ai_call(portfolio):
    analyst = FakeJobAnalyst()
    with pytest.raises(ResumeValidationError, match="Your portfolio is empty"):
        await JobAnalysisService(portfolio, analyst).analyze("owner", JOB_TEXT)
    assert analyst.received == []


async def test_sends_only_the_items_of_the_owner_and_writes_no_row(portfolio):
    mine = save_atlas(portfolio, "owner")
    save_northwind(portfolio, "other-member")
    analyst = FakeJobAnalyst()
    analysis = await JobAnalysisService(portfolio, analyst).analyze("owner", JOB_TEXT)
    assert [[item.id for item in items] for items in analyst.received] == [[mine.id]]
    assert [view.item_id for view in analysis.items] == [mine.id]
    assert len(portfolio.list_items("owner")) == 1 and len(portfolio.list_items("other-member")) == 1


@pytest.mark.parametrize("review_ids", [
    lambda atlas, northwind: [atlas, "unknown-id"],
    lambda atlas, northwind: [atlas],
    lambda atlas, northwind: [atlas, atlas],
    lambda atlas, northwind: [atlas, northwind, northwind],
])
async def test_an_unknown_missing_or_repeated_item_identifier_is_an_ai_error(portfolio, review_ids):
    atlas, northwind = save_atlas(portfolio), save_northwind(portfolio)
    result = job_analysis([review(item_id) for item_id in review_ids(atlas.id, northwind.id)])
    with pytest.raises(ExperienceAiError):
        await JobAnalysisService(portfolio, FakeJobAnalyst(result)).analyze("owner", JOB_TEXT)


def test_the_message_for_100_items_stays_in_the_limit():
    items = [item_view(f"item-{number}", text="t" * 4000) for number in range(ITEM_COUNT)]
    message = PortfolioPrompt().analysis_message("j" * JOB_TEXT_LENGTH, items)
    sent = json.loads(message)["portfolioItems"]
    assert len(sent) == ITEM_COUNT
    assert all(len(item["text"]) == ANALYSIS_TEXT_LENGTH for item in sent)
    assert set(sent[0]) == {"id", "type", "title", "company", "startDate", "endDate", "skills", "text"}
    assert len(message) < JOB_TEXT_LENGTH + ITEM_COUNT * (ANALYSIS_TEXT_LENGTH + 400)
