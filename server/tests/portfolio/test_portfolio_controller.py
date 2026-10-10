import pytest
from conftest import SignedInClient
from ieee.database import Database
from ieee.main import Application
from sqlalchemy import select
from ieee.portfolio.experience_ai_error import ExperienceAiError
from ieee.portfolio.portfolio_item import PortfolioItem
from .fake_experience_ai import FakeExtractor, FakeImprover
from .portfolio_samples import ORIGINAL

ITEM = {"type": "PROJECT", "title": "Atlas analytics dashboard", "company": "Acme Corp", "startDate": "2022-03",
        "endDate": "2023-06", "skills": ["Python", "React"], "originalText": ORIGINAL, "finalText": ORIGINAL}


def clients_with(settings, extractor: FakeExtractor, improver: FakeImprover) -> SignedInClient:
    application = Application(settings, Database(settings.database_url))
    application.extractor, application.improver = extractor, improver
    return SignedInClient(application)


@pytest.fixture
def ai_clients(settings) -> SignedInClient:
    return clients_with(settings, FakeExtractor(), FakeImprover())


def test_anonymous_calls_are_rejected(ai_clients):
    anonymous = ai_clients.anonymous()
    assert anonymous.get("/api/portfolio").status_code == 401
    assert anonymous.get("/api/portfolio/some-id").status_code == 401
    for path in ("/api/portfolio", "/api/portfolio/analyze", "/api/portfolio/improve"):
        assert anonymous.post(path, json={}).status_code == 401


def test_mutations_need_the_csrf_token(ai_clients):
    member = ai_clients.member(with_csrf=False)
    assert member.post("/api/portfolio", json=ITEM).status_code == 403
    assert member.post("/api/portfolio/analyze", json={"text": ORIGINAL}).status_code == 403
    assert member.post("/api/portfolio/improve", json={"text": ORIGINAL}).status_code == 403


def test_analyze_and_improve_return_typed_results_and_store_nothing(ai_clients):
    member = ai_clients.member()
    analysis = member.post("/api/portfolio/analyze", json={"text": ORIGINAL})
    assert analysis.status_code == 200
    assert analysis.json()["fields"] == {"title": "Atlas analytics dashboard", "type": "PROJECT", "company": "Acme Corp",
                                         "startDate": "2022-03", "endDate": "2023-06", "skills": ["Python", "React"]}
    assert analysis.json()["duplicates"] == []
    improved = member.post("/api/portfolio/improve", json={"text": ORIGINAL, "instruction": "Make it shorter"})
    assert improved.json() == {"text": "Improved: " + ORIGINAL, "note": "I used active verbs."}
    assert member.post("/api/portfolio/improve", json={"text": ORIGINAL}).status_code == 200
    assert member.get("/api/portfolio").json() == []


def test_only_save_stores_an_item_and_analyze_then_reports_the_duplicate(ai_clients):
    member = ai_clients.member()
    saved = member.post("/api/portfolio", json=ITEM)
    assert saved.status_code == 200
    assert set(saved.json()) == {"id", "type", "title", "company", "startDate", "endDate", "skills", "text", "createdAt",
                                 "updatedAt"}
    assert [item["id"] for item in member.get("/api/portfolio").json()] == [saved.json()["id"]]
    duplicates = member.post("/api/portfolio/analyze", json={"text": ORIGINAL}).json()["duplicates"]
    assert [(match["id"], match["level"]) for match in duplicates] == [(saved.json()["id"], "VERY_SIMILAR")]
    assert duplicates[0]["reason"] == "Similar title · Same company · Same period"


def test_a_member_cannot_read_the_item_of_another_owner(ai_clients):
    item_id = ai_clients.member(subject="owner").post("/api/portfolio", json=ITEM).json()["id"]
    assert ai_clients.member(subject="owner").get(f"/api/portfolio/{item_id}").status_code == 200
    other = ai_clients.member(subject="other-member")
    assert other.get(f"/api/portfolio/{item_id}").status_code == 404
    assert other.get("/api/portfolio").json() == []
    assert other.post("/api/portfolio/analyze", json={"text": ORIGINAL}).json()["duplicates"] == []


def test_input_limits_are_enforced(ai_clients):
    member = ai_clients.member()
    assert member.post("/api/portfolio/analyze", json={"text": "x" * 4001}).status_code == 400
    assert member.post("/api/portfolio/analyze", json={"text": "   "}).status_code == 400
    assert member.post("/api/portfolio/improve", json={"text": ORIGINAL, "instruction": "x" * 301}).status_code == 400
    assert member.post("/api/portfolio", json={**ITEM, "title": "T" * 161}).status_code == 400
    assert member.post("/api/portfolio", json={**ITEM, "skills": ["s" * 41]}).status_code == 400
    assert member.post("/api/portfolio", json={**ITEM, "type": "HOBBY"}).status_code == 400
    assert ai_clients.application.extractor.texts == []


def test_a_rule_error_returns_the_message_for_the_member(ai_clients):
    response = ai_clients.member().post("/api/portfolio", json={**ITEM, "startDate": "2024-01", "endDate": "2023-06"})
    assert response.status_code == 400
    assert response.json() == {"message": "The start date must not be after the end date."}
    skills = [f"skill {number}" for number in range(21)]
    response = ai_clients.member().post("/api/portfolio", json={**ITEM, "skills": skills})
    assert response.status_code == 400
    assert response.json() == {"message": "Keep at most 20 skills. Remove some skills, then save again."}


def test_an_ai_failure_returns_503_with_the_fixed_message(settings):
    member = clients_with(settings, FakeExtractor(fail=True), FakeImprover(fail=True)).member()
    for path in ("/api/portfolio/analyze", "/api/portfolio/improve"):
        response = member.post(path, json={"text": ORIGINAL})
        assert response.status_code == 503
        assert response.json() == {"message": ExperienceAiError.MESSAGE}


def test_missing_model_settings_return_503_and_never_the_cause(clients):
    member = clients.member()
    for path in ("/api/portfolio/analyze", "/api/portfolio/improve"):
        response = member.post(path, json={"text": ORIGINAL})
        assert response.status_code == 503
        assert response.json() == {"message": ExperienceAiError.MESSAGE}
        assert "Azure" not in response.text


UPDATE = {"type": "WORK", "title": "Atlas for the sales team", "company": "Acme Corporation", "startDate": "2022-04",
          "endDate": "2023-07", "skills": ["Python", "Kubernetes"], "finalText": "Led the build of Atlas."}


def test_put_changes_the_item_and_returns_the_date_of_the_change(ai_clients):
    member = ai_clients.member()
    saved = member.post("/api/portfolio", json=ITEM).json()
    response = member.put(f"/api/portfolio/{saved['id']}", json=UPDATE)
    assert response.status_code == 200
    updated = response.json()
    assert updated == {"id": saved["id"], "type": "WORK", "title": "Atlas for the sales team",
                       "company": "Acme Corporation", "startDate": "2022-04", "endDate": "2023-07",
                       "skills": ["Python", "Kubernetes"], "text": "Led the build of Atlas.",
                       "createdAt": saved["createdAt"], "updatedAt": updated["updatedAt"]}
    assert updated["updatedAt"] > saved["updatedAt"]
    assert member.get(f"/api/portfolio/{saved['id']}").json() == updated


def test_put_needs_a_session_and_the_csrf_token(ai_clients):
    item_id = ai_clients.member().post("/api/portfolio", json=ITEM).json()["id"]
    assert ai_clients.anonymous().put(f"/api/portfolio/{item_id}", json=UPDATE).status_code == 401
    assert ai_clients.member(with_csrf=False).put(f"/api/portfolio/{item_id}", json=UPDATE).status_code == 403
    assert ai_clients.member().get(f"/api/portfolio/{item_id}").json()["title"] == ITEM["title"]


def test_put_returns_404_for_the_item_of_another_member_and_for_an_unknown_item(ai_clients):
    item_id = ai_clients.member(subject="owner").post("/api/portfolio", json=ITEM).json()["id"]
    other = ai_clients.member(subject="other-member")
    response = other.put(f"/api/portfolio/{item_id}", json=UPDATE)
    assert response.status_code == 404
    assert response.json() == {"message": "The portfolio item does not exist."}
    assert other.put("/api/portfolio/unknown-id", json=UPDATE).status_code == 404
    assert ai_clients.member(subject="owner").get(f"/api/portfolio/{item_id}").json()["title"] == ITEM["title"]


@pytest.mark.parametrize("changes, message", [
    ({"title": "  "}, "Add a title before you save."),
    ({"skills": [f"skill {number}" for number in range(21)]},
     "Keep at most 20 skills. Remove some skills, then save again."),
    ({"startDate": "March 2022"}, "Use the date format YYYY, YYYY-MM, or YYYY-MM-DD."),
])
def test_put_returns_the_rule_message_for_the_member(ai_clients, changes, message):
    member = ai_clients.member()
    item_id = member.post("/api/portfolio", json=ITEM).json()["id"]
    response = member.put(f"/api/portfolio/{item_id}", json={**UPDATE, **changes})
    assert response.status_code == 400
    assert response.json() == {"message": message}
    assert member.get(f"/api/portfolio/{item_id}").json()["title"] == ITEM["title"]


def test_put_ignores_the_original_text_the_owner_and_the_id_in_the_body(ai_clients):
    owner = ai_clients.member(subject="owner")
    saved = owner.post("/api/portfolio", json=ITEM).json()
    body = {**UPDATE, "originalText": "A new original text.", "ownerId": "other-member", "id": "other-id"}
    updated = owner.put(f"/api/portfolio/{saved['id']}", json=body)
    assert updated.status_code == 200 and updated.json()["id"] == saved["id"]
    assert [item["id"] for item in owner.get("/api/portfolio").json()] == [saved["id"]]
    assert ai_clients.member(subject="other-member").get("/api/portfolio").json() == []
    with ai_clients.application.database.session() as session:
        stored = session.scalars(select(PortfolioItem)).one()
    assert (stored.id, stored.owner_id, stored.original_text) == (saved["id"], "owner", ORIGINAL)
