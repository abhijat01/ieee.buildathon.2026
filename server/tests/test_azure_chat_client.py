import pytest
from ieee.azure_chat_client import AzureChatClientFactory
from ieee.config import Settings


def test_missing_settings_raise_a_clear_error():
    models = AzureChatClientFactory(Settings(azure_openai_endpoint="", azure_openai_deployment="",
                                             azure_openai_api_key=""))
    assert not models.configured()
    with pytest.raises(RuntimeError, match="Azure model settings are missing."):
        models.create()


def test_complete_settings_create_a_chat_client():
    models = AzureChatClientFactory(Settings(azure_openai_endpoint="https://example.test/openai/v1/",
                                             azure_openai_deployment="configured-deployment",
                                             azure_openai_api_key="private-test-key"))
    assert models.configured()
    assert models.create() is not None
