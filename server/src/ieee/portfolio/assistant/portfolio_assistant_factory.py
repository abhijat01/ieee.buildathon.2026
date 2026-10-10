from agent_framework import Agent, SupportsChatGetResponse
from ieee.portfolio.assistant.item_context import ItemContext
from ieee.portfolio.assistant.item_context_provider import ItemContextProvider
from ieee.portfolio.assistant.portfolio_assistant_instructions import PortfolioAssistantInstructions

AGENT_NAME = "PortfolioAssistant"
AGENT_DESCRIPTION = "Helps the member to change one portfolio item."


class PortfolioAssistantFactory:
    """Creates the portfolio assistant for one run. The agent has no server tool, so it cannot save or read data."""

    def __init__(self, instructions: PortfolioAssistantInstructions):
        self.instructions = instructions

    def create(self, client: SupportsChatGetResponse, item: ItemContext) -> Agent:
        # One tool call in each answer. The MAF AG-UI runner stores parallel frontend calls without their arguments.
        return Agent(client=client, name=AGENT_NAME, description=AGENT_DESCRIPTION,
                     instructions=self.instructions.text(), context_providers=[ItemContextProvider(item)],
                     default_options={"allow_multiple_tool_calls": False})
