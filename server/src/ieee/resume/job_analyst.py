from ieee.azure_chat_client import AzureChatClientFactory
from ieee.portfolio.portfolio_item_view import PortfolioItemView
from ieee.portfolio.structured_agent import StructuredAgent
from ieee.resume.job_analysis import JobAnalysis
from ieee.resume.job_analyst_instructions import JobAnalystInstructions
from ieee.resume.portfolio_prompt import PortfolioPrompt


class JobAnalyst:
    """Finds the needs of a job and reviews each portfolio item against them. It does not change an item."""

    def __init__(self, models: AzureChatClientFactory, instructions: JobAnalystInstructions, prompt: PortfolioPrompt):
        self.agent = StructuredAgent(models, instructions.text(), JobAnalysis)
        self.prompt = prompt

    async def analyze(self, job_text: str, items: list[PortfolioItemView]) -> JobAnalysis:
        return await self.agent.run(self.prompt.analysis_message(job_text, items))
