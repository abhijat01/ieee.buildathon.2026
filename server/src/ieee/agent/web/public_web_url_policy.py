import ipaddress
import socket
import httpx

IpAddress = ipaddress.IPv4Address | ipaddress.IPv6Address

SITE_LOCAL_NETWORKS = (
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("fec0::/10"),
)
URL_LIMIT = 2048
ALLOWED_PORTS = (80, 443)


class PublicWebUrlPolicy:
    """Accepts only public HTTP and HTTPS website URLs.

    The policy resolves the host name. It rejects the URL if one resolved address is local or private.
    """

    def validate(self, address: str | None) -> httpx.URL:
        if address is None or not address.strip():
            raise ValueError("Provide a valid HTTP or HTTPS website URL.")
        try:
            url = httpx.URL(address)
        except (httpx.InvalidURL, TypeError):
            raise ValueError("Provide a valid HTTP or HTTPS website URL.") from None
        if (url.scheme.lower() not in ("http", "https") or not url.host
                or url.userinfo or len(address) > URL_LIMIT):
            raise ValueError("Provide a valid HTTP or HTTPS website URL without credentials.")
        if url.port is not None and url.port not in ALLOWED_PORTS:
            raise ValueError("Website requests support only ports 80 and 443.")
        try:
            resolved = self.resolve(url.host)
        except OSError:
            raise ValueError("The website hostname could not be resolved.") from None
        for candidate in resolved:
            if not self.is_public(candidate):
                raise ValueError("Website requests cannot access local or private network addresses.")
        return url

    def resolve(self, host: str) -> list[IpAddress]:
        """Return all addresses of the host. Tests replace this method."""
        results = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
        return [ipaddress.ip_address(result[4][0].split("%")[0]) for result in results]

    @staticmethod
    def is_public(address: IpAddress) -> bool:
        if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped is not None:
            address = address.ipv4_mapped
        if (address.is_unspecified or address.is_loopback or address.is_link_local or address.is_multicast
                or any(address in network for network in SITE_LOCAL_NETWORKS if network.version == address.version)):
            return False
        first = address.packed[0]
        if isinstance(address, ipaddress.IPv6Address):
            return (first & 0xE0) == 0x20
        second = address.packed[1]
        return (first != 0 and first < 224 and not (first == 100 and 64 <= second <= 127)
                and not (first == 198 and second in (18, 19)))
