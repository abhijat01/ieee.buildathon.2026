import ipaddress
import pytest
from ieee.agent.web.public_web_url_policy import PublicWebUrlPolicy


class ResolvedUrlPolicy(PublicWebUrlPolicy):
    """Returns fixed addresses instead of a DNS lookup."""

    def __init__(self, addresses: dict[str, list[str]]):
        self.addresses = addresses

    def resolve(self, host: str):
        if host not in self.addresses:
            raise OSError("unknown host")
        return [ipaddress.ip_address(address) for address in self.addresses[host]]


@pytest.mark.parametrize("url", ["file:///etc/passwd", "ftp://example.com", "https://user:password@example.com",
                                 "https://example.com:9010", "not a URL", "", None])
def test_rejects_unsupported_website_urls(url):
    with pytest.raises(ValueError):
        PublicWebUrlPolicy().validate(url)


@pytest.mark.parametrize("address", ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.0.1", "169.254.169.254",
                                     "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fc00::1", "198.18.0.1",
                                     "224.0.0.1", "::ffff:127.0.0.1"])
def test_rejects_private_and_local_addresses(address):
    assert not PublicWebUrlPolicy.is_public(ipaddress.ip_address(address))


@pytest.mark.parametrize("address", ["8.8.8.8", "2606:4700:4700::1111"])
def test_accepts_public_addresses(address):
    assert PublicWebUrlPolicy.is_public(ipaddress.ip_address(address))


def test_checks_all_resolved_addresses_before_the_request():
    policy = ResolvedUrlPolicy({"example.test": ["8.8.8.8", "127.0.0.1"]})
    with pytest.raises(ValueError, match="private network"):
        policy.validate("https://example.test")


def test_accepts_public_addresses_and_reports_unresolved_hosts():
    policy = ResolvedUrlPolicy({"example.test": ["8.8.8.8"]})
    assert policy.validate("https://example.test/page").host == "example.test"
    with pytest.raises(ValueError, match="could not be resolved"):
        policy.validate("https://missing.test")
