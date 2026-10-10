import pytest
from conftest import SignedInClient
from ieee.database import Database
from ieee.main import Application
from ieee.portfolio.experience_ai_error import ExperienceAiError
from .fake_resume_ai import FakeJobAnalyst, FakeTailor
from .resume_samples import ATLAS_TEXT, JOB_KEYWORDS, JOB_TEXT

ITEM = {"type": "PROJECT", "title": "Atlas analytics dashboard", "company": "Acme Corp", "startDate": "2022-03",
        "endDate": "2023-06", "skills": ["Python", "React"], "originalText": ATLAS_TEXT, "finalText": ATLAS_TEXT}
ANALYZE, WRITE = "/api/resume/analyze", "/api/resume/write"


def clients_with(settings, analyst: FakeJobAnalyst, tailor: FakeTailor) -> SignedInClient:
    application = Application(settings, Database(settings.database_url))
    application.job_analyst, application.tailor = analyst, tailor
    return SignedInClient(application)


@pytest.fixture
def ai_clients(settings) -> SignedInClient:
    return clients_with(settings, FakeJobAnalyst(), FakeTailor())


def write_body(item_ids: list[str], **changes) -> dict:
    return {"jobText": JOB_TEXT, "keywords": JOB_KEYWORDS, "itemIds": item_ids, **changes}


def saved_item_id(clients: SignedInClient, subject: str = "member-a") -> str:
    return clients.member(subject=subject).post("/api/portfolio", json=ITEM).json()["id"]


def test_anonymous_calls_are_rejected(ai_clients):
    for path in (ANALYZE, WRITE):
        assert ai_clients.anonymous().post(path, json={}).status_code == 401


def test_both_routes_need_the_csrf_token(ai_clients):
    item_id = saved_item_id(ai_clients)
    member = ai_clients.member(with_csrf=False)
    assert member.post(ANALYZE, json={"jobText": JOB_TEXT}).status_code == 403
    assert member.post(WRITE, json=write_body([item_id])).status_code == 403
    assert ai_clients.application.job_analyst.received == []


def test_analyze_returns_the_review_of_each_item_of_the_member(ai_clients):
    item_id = saved_item_id(ai_clients)
    saved_item_id(ai_clients, subject="other-member")
    response = ai_clients.member().post(ANALYZE, json={"jobText": JOB_TEXT})
    assert response.status_code == 200
    assert response.json() == {
        "jobTitle": "Senior Full-Stack Engineer", "company": "Contoso Analytics",
        "requirements": ["Build data pipelines with Python"], "keywords": JOB_KEYWORDS,
        "items": [{"itemId": item_id, "type": "PROJECT", "title": "Atlas analytics dashboard", "company": "Acme Corp",
                   "startDate": "2022-03", "endDate": "2023-06", "relevance": "HIGH", "reason": "Shows Python.",
                   "matchedKeywords": ["Python"], "proposed": True}]}


def test_write_returns_the_resume_and_does_not_change_the_portfolio(ai_clients):
    item_id = saved_item_id(ai_clients)
    member = ai_clients.member()
    before = member.get("/api/portfolio").json()
    response = member.post(WRITE, json=write_body([item_id]))
    assert response.status_code == 200
    resume = response.json()
    assert set(resume) == {"markdown", "fileName", "descriptions", "atsCheck"}
    assert resume["markdown"].startswith("# Abhijat\n[Email] | [Phone] | [City] | [LinkedIn]\n\n## Summary")
    assert resume["fileName"] == "resume-abhijat.md"
    assert resume["descriptions"] == [{"itemId": item_id, "title": "Atlas analytics dashboard", "company": "Acme Corp",
                                       "originalText": ATLAS_TEXT,
                                       "improvedText": "- Improved text of Atlas analytics dashboard"}]
    assert resume["atsCheck"]["keywords"] == {"inResume": ["Python", "React"], "inExcludedItems": [],
                                              "notInPortfolio": ["SQL", "Kubernetes", "AWS"]}
    assert member.get("/api/portfolio").json() == before


def test_an_item_of_a_different_member_gives_404_and_the_ai_receives_nothing(ai_clients):
    item_id = saved_item_id(ai_clients, subject="owner")
    other = ai_clients.member(subject="other-member")
    response = other.post(WRITE, json=write_body([item_id]))
    assert response.status_code == 404
    assert response.json() == {"message": "The portfolio item does not exist."}
    assert ai_clients.application.tailor.received == []
    assert ai_clients.member(subject="owner").post(WRITE, json=write_body([item_id])).status_code == 200


def test_an_empty_portfolio_gives_400_with_the_message_for_the_member(ai_clients):
    response = ai_clients.member().post(ANALYZE, json={"jobText": JOB_TEXT})
    assert response.status_code == 400
    assert response.json() == {"message": "Your portfolio is empty. Add an experience first."}


def test_input_limits_are_enforced(ai_clients):
    item_id = saved_item_id(ai_clients)
    member = ai_clients.member()
    assert member.post(ANALYZE, json={"jobText": "x" * 8001}).status_code == 400
    assert member.post(ANALYZE, json={"jobText": "   "}).status_code == 400
    assert member.post(ANALYZE, json={"jobText": "x" * 8000}).status_code == 200
    assert member.post(WRITE, json=write_body([item_id], jobText="x" * 8001)).status_code == 400
    assert member.post(WRITE, json=write_body([item_id], keywords=["k"] * 51)).status_code == 400
    assert member.post(WRITE, json=write_body([item_id], keywords=["k" * 61])).status_code == 400
    assert member.post(WRITE, json=write_body([])).status_code == 400
    assert member.post(WRITE, json=write_body(["i"] * 101)).status_code == 400
    assert member.post(WRITE, json=write_body(["i" * 37])).status_code == 400
    assert ai_clients.application.tailor.received == []


def test_an_ai_failure_returns_503_with_the_message_of_the_step(settings):
    clients = clients_with(settings, FakeJobAnalyst(fail=True), FakeTailor(fail=True))
    item_id = saved_item_id(clients)
    analysis = clients.member().post(ANALYZE, json={"jobText": JOB_TEXT})
    assert analysis.status_code == 503
    assert analysis.json() == {"message": "The AI could not analyze the job description. Your text is safe. Try again."}
    resume = clients.member().post(WRITE, json=write_body([item_id]))
    assert resume.status_code == 503
    assert resume.json() == {"message": "The AI could not write the resume. Your selection is safe. Try again."}
    improved = clients.member().post("/api/portfolio/improve", json={"text": ATLAS_TEXT})
    assert improved.json() == {"message": ExperienceAiError.MESSAGE}


def test_missing_model_settings_return_503_and_never_the_cause(clients):
    item_id = saved_item_id(clients)
    for path, body in ((ANALYZE, {"jobText": JOB_TEXT}), (WRITE, write_body([item_id]))):
        response = clients.member().post(path, json=body)
        assert response.status_code == 503
        assert "Azure" not in response.text
