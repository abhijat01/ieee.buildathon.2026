import pytest
from sqlalchemy import text
from ieee.azure_chat_client import AzureChatClientFactory
from ieee.config import Settings
from ieee.database import Database
from ieee.experience.analyze_experience import AnalyzeExperience
from ieee.experience.experience_extraction_service import ExperienceExtractionService
from ieee.experience.experience_fields import ExperienceFields
from ieee.experience.experience_validator import ExperienceValidator
from .experience_test_app import ExperienceTestApp

SAVE = {"type": "PROFESSIONAL", "originalInput": " At Acme I built Atlas. ", "company": "Acme",
        "projectName": "Edited Atlas", "startDate": "2022-03", "endDate": None,
        "description": "Reviewed dashboard description"}
PATHS = ("/api/experiences", "/api/experiences/analyze")


class FakeExtraction(ExperienceExtractionService):
    """Replaces the model call. Records each request."""

    def __init__(self):
        super().__init__(ExperienceValidator(), AzureChatClientFactory(Settings()))
        self.requests: list[AnalyzeExperience] = []

    async def analyze(self, request: AnalyzeExperience) -> ExperienceFields:
        self.requests.append(request)
        self.validator.input(request.type, request.original_input)
        return ExperienceFields(company="Acme", project_name="Atlas", start_date="2022-03", description="Built dashboard")


@pytest.fixture
def database(tmp_path):
    database = Database(f"sqlite:///{tmp_path / 'experience.db'}")
    database.migrate()
    yield database
    database.engine.dispose()


@pytest.fixture
def extraction():
    return FakeExtraction()


@pytest.fixture
def server(database, extraction):
    return ExperienceTestApp(database, extraction)


def count(database: Database) -> int:
    with database.engine.connect() as connection:
        return connection.execute(text("SELECT COUNT(*) FROM experience_entry")).scalar_one()


def test_auth_and_csrf_protect_both_endpoints(server, extraction):
    for path in PATHS:
        response = server.client(subject=None, csrf=True).post(path, json=SAVE)
        assert response.status_code == 401
        assert server.client(subject="member", csrf=False).post(path, json=SAVE).status_code == 403
    assert extraction.requests == []


def test_analysis_has_no_database_mutation_and_save_uses_authenticated_owner(server, database):
    response = server.client().post(PATHS[1], json={"type": "PROFESSIONAL", "originalInput": "At Acme I built Atlas."})
    assert response.status_code == 200
    assert response.json() == {"company": "Acme", "projectName": "Atlas", "startDate": "2022-03", "endDate": None,
                               "description": "Built dashboard"}
    assert count(database) == 0
    response = server.client(subject="owner-a").post(PATHS[0], json={"ownerId": "forged-owner", **SAVE})
    assert response.status_code == 200
    body = response.json()
    assert body["id"] and body["projectName"] == "Edited Atlas" and body["type"] == "PROFESSIONAL"
    assert body["originalInput"] == "At Acme I built Atlas." and "ownerId" not in body
    assert body["createdAt"].endswith("Z") or body["createdAt"].endswith("+00:00")
    with database.engine.connect() as connection:
        assert connection.execute(text("SELECT owner_id FROM experience_entry")).scalar_one() == "owner-a"
    assert count(database) == 1
    assert server.client(subject="other").get(PATHS[0]).status_code == 405


def test_invalid_reviewed_values_have_field_errors_and_no_rows(server, database):
    response = server.client().post(PATHS[0], json={**SAVE, "startDate": "2022-13"})
    assert response.status_code == 400
    assert response.json() == {"message": "Check the highlighted fields.",
                               "fields": {"startDate": "Use a valid YYYY, YYYY-MM, or YYYY-MM-DD date."}}
    assert count(database) == 0


def test_missing_or_unknown_type_is_a_field_error(server, database):
    for body in ({k: v for k, v in SAVE.items() if k != "type"}, {**SAVE, "type": "INTERN"}, {**SAVE, "type": 5}):
        for path in PATHS:
            response = server.client().post(path, json=body)
            assert response.status_code == 400
            assert response.json()["fields"] == {"type": "Choose an experience type."}
    assert count(database) == 0


def test_blank_analysis_input_is_a_field_error(server):
    response = server.client().post(PATHS[1], json={"type": "PROJECT", "originalInput": "  "})
    assert response.status_code == 400
    assert response.json()["fields"] == {"originalInput": "Enter 1–4,000 characters."}


def test_extraction_failure_returns_bad_gateway(database):
    unconfigured = ExperienceExtractionService(ExperienceValidator(), AzureChatClientFactory(Settings()))
    response = ExperienceTestApp(database, unconfigured).client().post(
        PATHS[1], json={"type": "PROJECT", "originalInput": "text"})
    assert response.status_code == 502
    assert response.json() == {"message": "Configure an Azure deployment with strict JSON schema support before analysis."}


def test_database_failure_cannot_return_success(server, database):
    with database.engine.begin() as connection:
        connection.execute(text("CREATE TRIGGER test_failure BEFORE INSERT ON experience_entry "
                                "WHEN NEW.company = 'Acme' BEGIN SELECT RAISE(ABORT, 'test failure'); END"))
    response = server.client().post(PATHS[0], json=SAVE)
    assert response.status_code == 503
    assert response.json() == {"message": "The experience could not be saved. Your edits remain available. Please retry."}
    assert count(database) == 0
