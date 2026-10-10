import json
import secrets
import subprocess

CONTAINER = "theragenx-local-dev-authentik-server"
CLIENT_ID = "sample-app-02"


def shell(source: str) -> dict:
    result = subprocess.run(
        ["docker", "exec", "-i", CONTAINER, "ak", "shell", "-c", "import sys; exec(sys.stdin.read())"],
        input=source, text=True, capture_output=True, check=False,
    )
    for line in reversed(result.stdout.splitlines()):
        if line.startswith("SAMPLE_APP_RESULT=") and result.returncode == 0:
            return json.loads(line.removeprefix("SAMPLE_APP_RESULT="))
    raise RuntimeError("Authentik setup failed. Confirm that the dedicated local authentik container is healthy.")


def provision(origin: str = "http://localhost:5300") -> dict:
    client_secret = secrets.token_urlsafe(48)
    return shell(f"""
import json
from django.db import transaction
from authentik.core.models import Application
from authentik.crypto.models import CertificateKeyPair
from authentik.flows.models import Flow
from authentik.providers.oauth2.models import OAuth2Provider, ScopeMapping
with transaction.atomic():
    provider, created = OAuth2Provider.objects.get_or_create(client_id={CLIENT_ID!r}, defaults={{
        "name": "IEEE Workspace — sample-app-02",
        "client_type": "confidential",
        "client_secret": {client_secret!r},
        "authorization_flow": Flow.objects.get(slug="default-provider-authorization-implicit-consent"),
        "invalidation_flow": Flow.objects.get(slug="default-provider-invalidation-flow"),
        "signing_key": CertificateKeyPair.objects.filter(name="authentik Self-signed Certificate").first(),
        "_redirect_uris": [
            {{"matching_mode": "strict", "url": "http://localhost:5300/login/oauth2/code/authentik"}},
            {{"matching_mode": "strict", "url": "http://localhost:5300/"}},
        ],
    }})
    if not created and provider.name != "IEEE Workspace — sample-app-02":
        raise RuntimeError("The client identifier belongs to another application.")
    if not provider.signing_key:
        raise RuntimeError("Authentik needs a signing certificate.")
    if created:
        provider.property_mappings.set(ScopeMapping.objects.filter(scope_name__in=["openid", "profile", "email"]))
    application, app_created = Application.objects.get_or_create(slug={CLIENT_ID!r}, defaults={{
        "name": "IEEE Workspace", "provider": provider,
        "meta_launch_url": "http://localhost:5300/", "policy_engine_mode": "any",
    }})
    if application.provider_id != provider.pk:
        raise RuntimeError("The application slug belongs to another provider.")
    redirect_uris = provider._redirect_uris or []
    for url in [{origin!r} + "/login/oauth2/code/authentik", {origin!r} + "/"]:
        if not any(entry.get("url") == url for entry in redirect_uris):
            redirect_uris.append({{"matching_mode": "strict", "url": url}})
    provider._redirect_uris = redirect_uris
    provider.save(update_fields=["_redirect_uris"])
    application.meta_launch_url = {origin!r} + "/"
    application.save(update_fields=["meta_launch_url"])
    print("SAMPLE_APP_RESULT=" + json.dumps({{"client_id": provider.client_id, "client_secret": provider.client_secret, "created": created}}))
""")
