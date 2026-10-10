from ieee.portfolio.duplicate_search_service import DuplicateSearchService
from ieee.portfolio.experience_analysis_service import ExperienceAnalysisService
from ieee.portfolio.match_level import MatchLevel
from ieee.portfolio.portfolio_service import PortfolioService
from .fake_experience_ai import FakeExtractor
from .portfolio_samples import ORIGINAL, save_request


async def test_joins_the_extracted_fields_and_the_matches_and_writes_no_row(database):
    portfolio = PortfolioService(database)
    existing = portfolio.save_item("owner", save_request(title="Atlas reporting dashboard"))
    extractor = FakeExtractor()
    analysis = await ExperienceAnalysisService(extractor, DuplicateSearchService(database)).analyze("owner", ORIGINAL)
    assert extractor.texts == [ORIGINAL]
    assert analysis.fields.title == "Atlas analytics dashboard"
    assert [(match.id, match.level) for match in analysis.duplicates] == [(existing.id, MatchLevel.VERY_SIMILAR)]
    assert len(portfolio.list_items("owner")) == 1


async def test_matches_only_the_items_of_the_owner(database):
    PortfolioService(database).save_item("other-member", save_request())
    analysis = await ExperienceAnalysisService(FakeExtractor(), DuplicateSearchService(database)).analyze("owner", ORIGINAL)
    assert analysis.duplicates == []
