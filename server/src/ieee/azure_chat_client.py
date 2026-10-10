from openai import AsyncOpenAI
from agent_framework.openai import OpenAIChatCompletionClient
from ieee.config import Settings


class AzureChatClientFactory:
    """Creates Microsoft Agent Framework chat clients for the Azure OpenAI v1 endpoint."""

    def __init__(self, settings: Settings):
        self.settings = settings

    def configured(self) -> bool:
        return self.settings.agent_configured()

    def create(self) -> OpenAIChatCompletionClient:
        if not self.configured():
            raise RuntimeError("Azure model settings are missing.")
        openai = AsyncOpenAI(base_url=self.settings.azure_openai_endpoint, api_key=self.settings.azure_openai_api_key,
                             default_headers={"api-key": self.settings.azure_openai_api_key}, timeout=80.0)
        return OpenAIChatCompletionClient(model=self.settings.azure_openai_deployment, async_client=openai)
