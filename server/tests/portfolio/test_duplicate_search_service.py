import pytest
from ieee.portfolio.duplicate_search_service import DuplicateSearchService
from ieee.portfolio.match_level import MatchLevel
from ieee.portfolio.portfolio_service import PortfolioService
from .portfolio_samples import atlas_fields, save_request


@pytest.fixture
def portfolio(database) -> PortfolioService:
    return PortfolioService(database)


@pytest.fixture
def search(database) -> DuplicateSearchService:
    return DuplicateSearchService(database)


def test_finds_a_similar_title_at_the_same_company_with_level_and_reason(portfolio, search):
    saved = portfolio.save_item("owner", save_request(title="Atlas reporting dashboard"))
    matches = search.find("owner", atlas_fields())
    assert [(match.id, match.level) for match in matches] == [(saved.id, MatchLevel.VERY_SIMILAR)]
    assert matches[0].reason == "Similar title · Same company · Same period"


def test_the_same_company_in_the_same_period_is_some_overlap(portfolio, search):
    portfolio.save_item("owner", save_request(title="Sales data pipeline", start_date="2023-01", end_date="2023-12"))
    matches = search.find("owner", atlas_fields())
    assert [(match.level, match.reason) for match in matches] == [(MatchLevel.SOME_OVERLAP, "Same company · Same period")]


def test_a_different_company_title_and_period_is_not_a_match(portfolio, search):
    portfolio.save_item("owner", save_request(title="Senior Software Engineer", company="Northwind Labs",
                                              start_date="2019-01", end_date="2021-05"))
    portfolio.save_item("owner", save_request(title="Sales data pipeline", start_date="2021-06", end_date="2022-02"))
    assert search.find("owner", atlas_fields()) == []


def test_returns_at_most_three_matches_with_the_very_similar_matches_first(portfolio, search):
    for title in ("Sales pipeline", "Billing service", "Search service"):
        portfolio.save_item("owner", save_request(title=title))
    best = portfolio.save_item("owner", save_request(title="Atlas analytics dashboard"))
    matches = search.find("owner", atlas_fields())
    assert len(matches) == 3
    assert matches[0].id == best.id


def test_ignores_the_items_of_other_owners(portfolio, search):
    portfolio.save_item("other-member", save_request())
    assert search.find("owner", atlas_fields()) == []


def test_missing_company_and_dates_do_not_cause_an_error(portfolio, search):
    portfolio.save_item("owner", save_request(company=None, start_date=None, end_date=None))
    matches = search.find("owner", atlas_fields(company=None, start_date=None, end_date=None))
    assert [match.level for match in matches] == [MatchLevel.SOME_OVERLAP]


def test_one_shared_title_word_is_a_related_title_and_not_a_similar_title(portfolio, search):
    portfolio.save_item("owner", save_request(title="Atlas mobile app", start_date="2019", end_date="2020"))
    matches = search.find("owner", atlas_fields())
    assert [(match.level, match.reason) for match in matches] == [(MatchLevel.SOME_OVERLAP, "Related title · Same company")]


def test_the_company_comparison_ignores_case_and_outer_spaces(portfolio, search):
    portfolio.save_item("owner", save_request(title="Atlas reporting dashboard"))
    matches = search.find("owner", atlas_fields(company="  acme corp "))
    assert [match.level for match in matches] == [MatchLevel.VERY_SIMILAR]
