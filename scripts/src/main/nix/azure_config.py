import configparser
from pathlib import Path

AZURE_FIELDS = {
    "AZURE_OPENAI_ENDPOINT": "azure_openai_endpoint",
    "AZURE_OPENAI_API_KEY": "azure_openai_api_key",
    "AZURE_OPENAI_DEPLOYMENT": "default_openai_model",
}


def load_azure_config(env: dict) -> None:
    path = Path(env.get("AGENT_DEPLOYMENT_FILE") or "~/.agent.config/deployment.ini").expanduser()
    if not path.is_file():
        return
    config = configparser.ConfigParser(interpolation=None)
    try:
        config.read(path)
    except configparser.Error:
        raise RuntimeError("Cannot parse the agent deployment configuration.") from None
    if not config.has_section("_secrets"):
        return
    for variable, option in AZURE_FIELDS.items():
        if not env.get(variable):
            env[variable] = config.get("_secrets", option, fallback="").strip().strip("\"'")
