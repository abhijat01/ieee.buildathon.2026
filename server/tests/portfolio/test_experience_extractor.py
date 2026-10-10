import pytest
from ieee.portfolio.experience_ai_error import ExperienceAiError
from ieee.portfolio.experience_extractor import ExperienceExtractor
from ieee.portfolio.experience_type import ExperienceType
from ieee.portfolio.extracted_fields import ExtractedFields
from ieee.portfolio.extraction_instructions import ExtractionInstructions
from .portfolio_samples import ORIGINAL
from .scripted_chat_client import ScriptedChatClient, ScriptedModels

REPLY = ('{"title":"Atlas analytics dashboard","type":"PROJECT","company":"Acme Corp","startDate":"2022-03",'
         '"endDate":"2023-06","skills":["Python","React"]}')


def extractor(client: ScriptedChatClient) -> ExperienceExtractor:
    return ExperienceExtractor(ScriptedModels(client), ExtractionInstructions())


async def test_returns_typed_fields_and_sends_the_member_text_as_the_user_message():
    client = ScriptedChatClient(REPLY)
    fields = await extractor(client).extract(ORIGINAL)
    assert fields.type is ExperienceType.PROJECT
    assert (fields.title, fields.company, fields.start_date, fields.end_date) == (
        "Atlas analytics dashboard", "Acme Corp", "2022-03", "2023-06")
    assert fields.skills == ["Python", "React"]
    assert client.text_of("user") == ORIGINAL
    assert ORIGINAL not in client.text_of("system")
    assert client.options[-1]["response_format"] is ExtractedFields
    assert "Acme" not in client.options[-1].get("instructions", "")


async def test_null_fields_are_valid_and_long_values_are_cut_to_the_limits():
    reply = ('{"title":"' + "T" * 300 + '","type":"WORK","company":null,"startDate":null,"endDate":null,'
             '"skills":["' + "s" * 90 + '",""]}')
    fields = await extractor(ScriptedChatClient(reply)).extract("I mentored interns.")
    assert len(fields.title) == 160 and fields.company is None
    assert fields.skills == ["s" * 40]


@pytest.mark.parametrize("reply", [
    "This is not JSON.",
    '{"title":"Atlas"}',
    REPLY.replace('"PROJECT"', '"HOBBY"'),
    REPLY.replace('"2022-03"', '"March 2022"'),
])
async def test_invalid_model_output_raises_an_explicit_error(reply):
    with pytest.raises(ExperienceAiError):
        await extractor(ScriptedChatClient(reply)).extract(ORIGINAL)


async def test_a_model_failure_raises_the_error_without_the_provider_text():
    client = ScriptedChatClient(failure=RuntimeError("provider secret detail"))
    with pytest.raises(ExperienceAiError) as error:
        await extractor(client).extract(ORIGINAL)
    assert "provider secret detail" not in str(error.value)


def test_each_schema_field_has_a_description_for_the_model():
    properties = ExtractedFields.model_json_schema()["properties"]
    assert set(properties) == {"title", "type", "company", "startDate", "endDate", "skills"}
    assert all(property.get("description") for property in properties.values())
