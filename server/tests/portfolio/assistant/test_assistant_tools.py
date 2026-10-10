import pytest
from pydantic import ValidationError
from ieee.portfolio.assistant.assistant_tools import AssistantTools
from ieee.portfolio.assistant.propose_fields_arguments import ProposeFieldsArguments
from ieee.portfolio.assistant.propose_skills_arguments import ProposeSkillsArguments
from ieee.portfolio.assistant.propose_text_arguments import ProposeTextArguments


def test_the_allowlist_has_the_three_propose_tools():
    assert AssistantTools.NAMES == {"proposeText", "proposeSkills", "proposeFields"}


def test_each_definition_has_a_description_and_a_schema_with_a_description_for_each_parameter():
    definitions = AssistantTools().definitions(["proposeText", "proposeSkills", "proposeFields", "proposeText"])
    assert [definition["name"] for definition in definitions] == ["proposeText", "proposeSkills", "proposeFields"]
    for definition in definitions:
        assert definition["description"]
        assert all(parameter["description"] for parameter in definition["parameters"]["properties"].values())
    text, skills, fields = (definition["parameters"] for definition in definitions)
    assert [text["properties"][name]["maxLength"] for name in ("text", "label", "reason")] == [20000, 40, 200]
    assert (skills["properties"]["skills"]["maxItems"], skills["properties"]["skills"]["items"]["maxLength"]) == (20, 40)
    assert fields["$defs"]["ItemField"]["enum"] == ["title", "type", "company", "startDate", "endDate"]
    assert fields["$defs"]["FieldChange"]["properties"]["reason"]["maxLength"] == 200


def test_an_unknown_tool_name_has_no_definition():
    with pytest.raises(KeyError):
        AssistantTools().definitions(["deleteItem"])


@pytest.mark.parametrize("arguments, values", [
    (ProposeTextArguments, {"text": "x" * 20001, "label": "L", "reason": "R"}),
    (ProposeTextArguments, {"text": "Text", "label": "L" * 41, "reason": "R"}),
    (ProposeTextArguments, {"text": "Text", "label": "L", "reason": "R" * 201}),
    (ProposeSkillsArguments, {"skills": ["s" * 41]}),
    (ProposeSkillsArguments, {"skills": ["skill"] * 21}),
    (ProposeFieldsArguments, {"changes": [{"field": "owner", "value": "x", "reason": "R"}]}),
    (ProposeFieldsArguments, {"changes": [{"field": "title", "value": "x", "reason": "R" * 201}]}),
])
def test_the_argument_models_apply_the_limits(arguments, values):
    with pytest.raises(ValidationError):
        arguments.model_validate(values)
