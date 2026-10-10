from ieee.azure_chat_client import AzureChatClientFactory
from ieee.portfolio.extracted_fields import ExtractedFields
from ieee.portfolio.extraction_instructions import ExtractionInstructions
from ieee.portfolio.structured_agent import StructuredAgent


class ExperienceExtractor:
    """Extracts the portfolio fields from an experience text. It does not change the text."""

    def __init__(self, models: AzureChatClientFactory, instructions: ExtractionInstructions):
        self.agent = StructuredAgent(models, instructions.text(), ExtractedFields)

    async def extract(self, text: str) -> ExtractedFields:
        fields = await self.agent.run(text)
        return fields.within_limits()
