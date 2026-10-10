import asyncio
import logging
from typing import Generic, TypeVar
from agent_framework import Agent, SupportsChatGetResponse
from pydantic import BaseModel
from ieee.azure_chat_client import AzureChatClientFactory
from ieee.portfolio.experience_ai_error import ExperienceAiError

logger = logging.getLogger(__name__)
TIMEOUT_SECONDS = 85
ResultT = TypeVar("ResultT", bound=BaseModel)


class StructuredAgent(Generic[ResultT]):
    """Runs one Microsoft Agent Framework agent that returns a validated Pydantic object."""

    def __init__(self, models: AzureChatClientFactory, instructions: str, result_type: type[ResultT]):
        self.models = models
        self.instructions = instructions
        self.result_type = result_type
        self._client: SupportsChatGetResponse | None = None

    async def run(self, member_text: str) -> ResultT:
        """Sends the member text as the user message. Converts each failure to ExperienceAiError."""
        try:
            agent = Agent(client=self._chat_client(), instructions=self.instructions)
            response = await asyncio.wait_for(
                agent.run(member_text, options={"response_format": self.result_type}), TIMEOUT_SECONDS)
            value = response.value
        except Exception as exception:  # The boundary to the model provider.
            logger.warning("The AI call failed: %s: %s", type(exception).__name__, exception)
            raise ExperienceAiError() from None
        if not isinstance(value, self.result_type):
            logger.warning("The AI returned no structured result.")
            raise ExperienceAiError()
        return value

    def _chat_client(self) -> SupportsChatGetResponse:
        if self._client is None:
            self._client = self.models.create()
        return self._client
