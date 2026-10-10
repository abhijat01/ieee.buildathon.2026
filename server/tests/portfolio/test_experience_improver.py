import json
import pytest
from ieee.portfolio.experience_ai_error import ExperienceAiError
from ieee.portfolio.experience_improver import ExperienceImprover
from ieee.portfolio.improved_text import ImprovedText
from ieee.portfolio.improvement_instructions import ImprovementInstructions
from .portfolio_samples import ORIGINAL
from .scripted_chat_client import ScriptedChatClient, ScriptedModels


def reply(text: str) -> str:
    return json.dumps({"text": text, "note": "I used active verbs."})


def improver(client: ScriptedChatClient) -> ExperienceImprover:
    return ExperienceImprover(ScriptedModels(client), ImprovementInstructions())


async def test_returns_a_typed_proposal_and_sends_the_instruction_in_the_user_message():
    client = ScriptedChatClient(reply("Led the build of Atlas."))
    improved = await improver(client).improve(ORIGINAL, " Make it shorter ")
    assert (improved.text, improved.note) == ("Led the build of Atlas.", "I used active verbs.")
    assert "Instruction from the member: Make it shorter" in client.text_of("user")
    assert ORIGINAL in client.text_of("user")
    assert client.options[-1]["response_format"] is ImprovedText


async def test_works_without_an_instruction():
    client = ScriptedChatClient(reply("Led the build of Atlas."))
    await improver(client).improve(ORIGINAL, "")
    assert "Instruction from the member: none" in client.text_of("user")


@pytest.mark.parametrize("model_reply", ["no JSON", '{"text":"only text"}', reply("  "), reply("x" * 4001)])
async def test_invalid_model_output_raises_an_explicit_error(model_reply):
    with pytest.raises(ExperienceAiError):
        await improver(ScriptedChatClient(model_reply)).improve(ORIGINAL, "")


async def test_a_model_failure_raises_an_explicit_error():
    with pytest.raises(ExperienceAiError):
        await improver(ScriptedChatClient(failure=TimeoutError())).improve(ORIGINAL, "")
