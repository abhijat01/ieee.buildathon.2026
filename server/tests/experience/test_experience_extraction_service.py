import pytest
from ieee.azure_chat_client import AzureChatClientFactory
from ieee.config import Settings
from ieee.experience.analyze_experience import AnalyzeExperience
from ieee.experience.experience_extraction_exception import ExperienceExtractionException
from ieee.experience.experience_extraction_service import ExperienceExtractionService
from ieee.experience.experience_fields import ExperienceFields
from ieee.experience.experience_type import ExperienceType
from ieee.experience.experience_validation_exception import ExperienceValidationException
from ieee.experience.experience_validator import ExperienceValidator
from .fake_chat_server import FakeChatServer

VALID = ('{"company":"Acme","projectName":null,"startDate":"2022-03","endDate":null,'
         '"description":"Built a dashboard"}')
KEY = "private-key"


def service(endpoint: str = "", key: str = "") -> ExperienceExtractionService:
    settings = Settings(azure_openai_endpoint=endpoint, azure_openai_deployment="deployment" if endpoint else "",
                        azure_openai_api_key=key)
    return ExperienceExtractionService(ExperienceValidator(), AzureChatClientFactory(settings))


def analyze(type: ExperienceType, text: str) -> AnalyzeExperience:
    return AnalyzeExperience(type=type, original_input=text)


@pytest.fixture
def chat():
    server = FakeChatServer().start()
    yield server
    server.stop()


async def test_strict_transport_makes_one_call_without_tools_and_validates_output(chat):
    chat.answer(VALID)
    extraction = service(chat.url, KEY)
    with pytest.raises(ExperienceValidationException):
        await extraction.analyze(analyze(ExperienceType.PROJECT, " "))
    assert chat.requests == []
    result = await extraction.analyze(analyze(ExperienceType.PROFESSIONAL, "At Acme I built a dashboard in March 2022."))
    assert result.start_date == "2022-03" and result.company == "Acme"
    assert len(chat.requests) == 1
    request = chat.requests[0]
    root = request["body"]
    assert request["path"] == "/chat/completions"
    assert root["model"] == "deployment"
    assert root["stream"] is False and "tools" not in root
    assert root["messages"][0]["role"] == "system"
    assert root["messages"][0]["content"].startswith("Extract one experience from the supplied text.")
    assert root["messages"][1]["content"] == "Selected type: PROFESSIONAL\nSource text:\nAt Acme I built a dashboard in March 2022."
    schema = root["response_format"]["json_schema"]
    assert root["response_format"]["type"] == "json_schema"
    assert schema["strict"] is True
    assert schema["schema"]["additionalProperties"] is False
    assert len(schema["schema"]["required"]) == 5
    assert "[0-9]{4}" in schema["schema"]["properties"]["startDate"]["pattern"]


async def test_rejects_invalid_structured_responses():
    extraction = service()
    assert extraction.parse(VALID).company == "Acme"
    for invalid in ("{}", VALID + " {}", VALID + " prose", VALID.replace("null", "42"),
                    VALID.replace("2022-03", "2022-13"), VALID.replace('"company":', '"extra":null,"company":'),
                    VALID.replace('"company":', '"company":null,"company":'), "[]", "null",
                    VALID.replace('"Acme"', "true")):
        with pytest.raises(Exception):
            extraction.parse(invalid)
    with pytest.raises(ExperienceExtractionException) as error:
        await extraction.analyze(analyze(ExperienceType.PROJECT, "test"))
    assert error.value.message == "Configure an Azure deployment with strict JSON schema support before analysis."


async def test_refuses_incomplete_refused_and_failed_provider_responses(chat):
    extraction = service(chat.url, KEY)
    failed = "Analysis failed. Check the Azure deployment's strict JSON schema support, then retry."
    for finish in ("length", "content_filter", None):
        chat.answer(VALID, finish_reason=finish)
        with pytest.raises(ExperienceExtractionException) as error:
            await extraction.analyze(analyze(ExperienceType.PROJECT, "text"))
        assert error.value.message == failed and KEY not in str(error.value)
    chat.answer(None, refusal="Cannot extract")
    with pytest.raises(ExperienceExtractionException):
        await extraction.analyze(analyze(ExperienceType.PROJECT, "text"))
    chat.answer(VALID, refusal="Cannot extract")
    with pytest.raises(ExperienceExtractionException):
        await extraction.analyze(analyze(ExperienceType.PROJECT, "text"))
    chat.answer("")
    with pytest.raises(ExperienceExtractionException):
        await extraction.analyze(analyze(ExperienceType.PROJECT, "text"))
    chat.status, chat.reply = 400, {"error": {"message": "Unsupported response_format"}}
    with pytest.raises(ExperienceExtractionException) as error:
        await extraction.analyze(analyze(ExperienceType.PROJECT, "text"))
    assert KEY not in str(error.value)


def test_missing_names_cannot_become_invented_activity_titles():
    extraction = service()
    source = "I built an internal reporting dashboard."
    for title in ("Internal reporting dashboard", "Internal Reporting Dashboard", "internal reporting dashboard",
                  "Reporting Dashboard"):
        result = extraction.grounded(ExperienceFields(company="Acme", project_name=title,
                                                      description="Built an internal reporting dashboard."), source)
        assert result.company is None and result.project_name is None
        assert result.description == "Built an internal reporting dashboard."
    explicit = extraction.grounded(ExperienceFields(company="Acme", project_name="Project Atlas", start_date="2022-03",
                                                    description="Built a dashboard"),
                                   "At Acme, I worked on Project Atlas from March 2022.")
    assert (explicit.company, explicit.project_name, explicit.start_date) == ("Acme", "Project Atlas", "2022-03")

    def project(name: str, source: str) -> str | None:
        return extraction.grounded(ExperienceFields(project_name=name, description="Built"), source).project_name

    def company(name: str, source: str) -> str | None:
        return extraction.grounded(ExperienceFields(company=name, description="Built"), source).company

    assert project("atlas", "I worked on project atlas.") == "atlas"
    assert project("atlas", "Project name: atlas.") == "atlas"
    assert project("atlas", "project:atlas") == "atlas"
    assert company("acme", "company=acme") == "acme"
    assert company("atlas", "format atlas") is None
    assert project("atlas", "subproject atlas") is None
    assert company("Acme", "I worked at AcmeCorp.") is None
    assert company("Acme", "I worked at Acme2.") is None
    assert company("Müller", "Ich arbeitete bei Müllerei.") is None
    assert company("Müller", "I worked at Müller.") == "Müller"
    assert company("a.b", "I worked at axb.") is None
