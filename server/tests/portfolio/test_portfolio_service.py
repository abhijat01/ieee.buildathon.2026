import pytest
from sqlalchemy import select
from ieee.portfolio.portfolio_item import PortfolioItem
from ieee.portfolio.portfolio_item_not_found import PortfolioItemNotFound
from ieee.portfolio.portfolio_service import PortfolioService
from ieee.portfolio.portfolio_validation_error import PortfolioValidationError
from ieee.portfolio.experience_type import ExperienceType
from .portfolio_samples import ORIGINAL, save_request, update_request


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


def test_get_items_returns_only_the_items_of_the_owner_in_the_given_order(portfolio):
    first = portfolio.save_item("owner", save_request(title="First"))
    second = portfolio.save_item("owner", save_request(title="Second"))
    other = portfolio.save_item("other-member", save_request())
    assert [item.title for item in portfolio.get_items("owner", [second.id, first.id, second.id])] == ["Second", "First"]
    assert portfolio.get_items("owner", []) == []
    for item_ids in ([first.id, other.id], [first.id, "unknown-id"]):
        with pytest.raises(PortfolioItemNotFound):
            portfolio.get_items("owner", item_ids)


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


def test_a_new_item_has_the_creation_date_as_the_date_of_the_last_change(portfolio):
    saved = portfolio.save_item("owner", save_request())
    assert saved.updated_at == saved.created_at


def test_update_changes_the_fields_and_the_final_text_and_keeps_the_original_text(portfolio, database):
    saved = portfolio.save_item("owner", save_request())
    updated = portfolio.update_item("owner", saved.id, update_request(title="  Atlas for the sales team  ", end_date=""))
    assert (updated.id, updated.type, updated.title, updated.company) == (
        saved.id, ExperienceType.WORK, "Atlas for the sales team", "Acme Corporation")
    assert (updated.start_date, updated.end_date, updated.skills) == ("2022-04", None, ["Python", "Kubernetes"])
    assert updated.text == "Led the build of Atlas at **Acme Corporation**."
    assert updated.created_at == saved.created_at and updated.updated_at > saved.updated_at
    assert portfolio.get_item("owner", saved.id) == updated
    with database.session() as session:
        stored = session.scalars(select(PortfolioItem)).one()
    assert stored.original_text == ORIGINAL


def test_update_does_not_change_the_item_of_another_owner_or_an_unknown_item(portfolio):
    saved = portfolio.save_item("owner", save_request())
    with pytest.raises(PortfolioItemNotFound):
        portfolio.update_item("other-member", saved.id, update_request())
    with pytest.raises(PortfolioItemNotFound):
        portfolio.update_item("owner", "unknown-id", update_request())
    assert portfolio.get_item("owner", saved.id) == saved


@pytest.mark.parametrize("changes, message", [
    ({"title": "   "}, "Add a title"),
    ({"final_text": "  "}, "Add the experience text"),
    ({"start_date": "March 2022"}, "date format"),
    ({"end_date": "2023-13"}, "date format"),
    ({"start_date": "2023-08", "end_date": "2023-07"}, "start date must not be after"),
    ({"skills": [f"skill {number}" for number in range(21)]}, "at most 20 skills"),
])
def test_update_applies_each_rule_of_save(portfolio, changes, message):
    saved = portfolio.save_item("owner", save_request())
    with pytest.raises(PortfolioValidationError, match=message):
        portfolio.update_item("owner", saved.id, update_request(**changes))
    assert portfolio.get_item("owner", saved.id) == saved
