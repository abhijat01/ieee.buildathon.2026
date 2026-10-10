import logging
from ieee.azure_chat_client import AzureChatClientFactory
from ieee.portfolio.experience_ai_error import ExperienceAiError
from ieee.portfolio.improved_text import ImprovedText
from ieee.portfolio.improvement_instructions import ImprovementInstructions
from ieee.portfolio.portfolio_limits import TEXT_LENGTH
from ieee.portfolio.structured_agent import StructuredAgent

logger = logging.getLogger(__name__)


class ExperienceImprover:
    """Proposes an improved experience text. The member accepts or rejects the proposal."""

    def __init__(self, models: AzureChatClientFactory, instructions: ImprovementInstructions):
        self.agent = StructuredAgent(models, instructions.text(), ImprovedText)

    async def improve(self, text: str, instruction: str) -> ImprovedText:
        request = f"Instruction from the member: {instruction.strip() or 'none'}\n\nExperience text:\n{text}"
        improved = await self.agent.run(request)
        if not improved.text.strip() or len(improved.text) > TEXT_LENGTH:
            logger.warning("The AI returned an improved text with an invalid length.")
            raise ExperienceAiError()
        return improved
