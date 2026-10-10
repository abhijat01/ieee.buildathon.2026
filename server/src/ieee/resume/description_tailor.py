from ieee.azure_chat_client import AzureChatClientFactory
from ieee.portfolio.portfolio_item_view import PortfolioItemView
from ieee.portfolio.structured_agent import StructuredAgent
from ieee.resume.keyword_check import KeywordCheck
from ieee.resume.portfolio_prompt import PortfolioPrompt
from ieee.resume.tailor_instructions import TailorInstructions
from ieee.resume.tailored_resume import TailoredResume


class DescriptionTailor:
    """Writes the summary and the improved descriptions of the included items for one job."""

    def __init__(self, models: AzureChatClientFactory, instructions: TailorInstructions, prompt: PortfolioPrompt):
        self.agent = StructuredAgent(models, instructions.text(), TailoredResume)
        self.prompt = prompt

    async def tailor(self, job_text: str, keywords: KeywordCheck, items: list[PortfolioItemView]) -> TailoredResume:
        return await self.agent.run(self.prompt.tailor_message(job_text, keywords, items))
