import pytest
from sqlalchemy import select
from ieee.portfolio.portfolio_item import PortfolioItem
from ieee.portfolio.portfolio_item_not_found import PortfolioItemNotFound
from ieee.portfolio.portfolio_service import PortfolioService
from ieee.portfolio.portfolio_validation_error import PortfolioValidationError
from .portfolio_samples import ORIGINAL, save_request


@pytest.fixture
def portfolio(database) -> PortfolioService:
    return PortfolioService(database)


def test_save_and_list_are_scoped_to_the_owner(portfolio):
    saved = portfolio.save_item("owner", save_request())
    assert [item.id for item in portfolio.list_items("owner")] == [saved.id]
    assert portfolio.list_items("other-member") == []
    assert portfolio.get_item("owner", saved.id).title == "Atlas analytics dashboard"
    with pytest.raises(PortfolioItemNotFound):
        portfolio.get_item("other-member", saved.id)


def test_save_cleans_the_fields(portfolio):
    saved = portfolio.save_item("owner", save_request(title="  Atlas  ", company="  ", end_date="",
                                                      skills=["Python", " python ", "", "React"]))
    assert (saved.title, saved.company, saved.end_date, saved.skills) == ("Atlas", None, None, ["Python", "React"])


@pytest.mark.parametrize("changes, message", [
    ({"title": "   "}, "Add a title"),
    ({"final_text": "  "}, "Add the experience text"),
    ({"start_date": "March 2022"}, "date format"),
    ({"end_date": "2023-13"}, "date format"),
    ({"start_date": "2023-07", "end_date": "2023-06"}, "start date must not be after"),
    ({"skills": [f"skill {number}" for number in range(21)]}, "at most 20 skills"),
])
def test_invalid_items_are_rejected_with_a_message_for_the_member(portfolio, changes, message):
    with pytest.raises(PortfolioValidationError, match=message):
        portfolio.save_item("owner", save_request(**changes))
    assert portfolio.list_items("owner") == []


def test_a_period_within_one_year_is_valid(portfolio):
    assert portfolio.save_item("owner", save_request(start_date="2023", end_date="2023-06")).start_date == "2023"


def test_the_original_text_stays_the_same_when_the_final_text_is_the_improved_text(portfolio, database):
    saved = portfolio.save_item("owner", save_request(final_text="Led the build of Atlas at **Acme Corp**."))
    assert saved.text == "Led the build of Atlas at **Acme Corp**."
    with database.session() as session:
        stored = session.scalars(select(PortfolioItem)).one()
    assert stored.original_text == ORIGINAL
