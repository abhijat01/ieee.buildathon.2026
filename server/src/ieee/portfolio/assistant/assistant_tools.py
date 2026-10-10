from typing import Any
from pydantic import BaseModel
from ieee.portfolio.assistant.propose_fields_arguments import ProposeFieldsArguments
from ieee.portfolio.assistant.propose_skills_arguments import ProposeSkillsArguments
from ieee.portfolio.assistant.propose_text_arguments import ProposeTextArguments

PROPOSE_TEXT = "proposeText"
PROPOSE_SKILLS = "proposeSkills"
PROPOSE_FIELDS = "proposeFields"
SHOWN_NOTE = "The browser shows the proposal in the form. The member accepts or rejects it later."


class AssistantTools:
    """The frontend tools of the portfolio assistant. The browser runs them. The server owns each schema.

    The server accepts no other client tool, and it does not accept a schema from the browser.
    """

    DESCRIPTIONS: dict[str, str] = {
        PROPOSE_TEXT: f"Propose a new experience text. {SHOWN_NOTE}",
        PROPOSE_SKILLS: f"Propose skills to add to the skill list. {SHOWN_NOTE}",
        PROPOSE_FIELDS: f"Propose new values for the title, type, company, or dates. {SHOWN_NOTE}",
    }
    ARGUMENTS: dict[str, type[BaseModel]] = {
        PROPOSE_TEXT: ProposeTextArguments,
        PROPOSE_SKILLS: ProposeSkillsArguments,
        PROPOSE_FIELDS: ProposeFieldsArguments,
    }
    NAMES: frozenset[str] = frozenset(ARGUMENTS)

    def definitions(self, names: list[str]) -> list[dict[str, Any]]:
        """Return the AG-UI tool definitions for the declared names. An unknown name fails loudly."""
        return [{"name": name, "description": self.DESCRIPTIONS[name],
                 "parameters": self.ARGUMENTS[name].model_json_schema()} for name in dict.fromkeys(names)]
