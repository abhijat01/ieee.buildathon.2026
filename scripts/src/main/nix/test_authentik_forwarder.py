import asyncio
import unittest
from unittest.mock import patch
from authentik_forwarder import AuthentikForwarder


class AuthentikForwarderTest(unittest.IsolatedAsyncioTestCase):
    async def test_forwards_request_and_response_without_changing_host(self):
        async def upstream(reader, writer):
            request = await reader.readuntil(b'\r\n\r\n')
            self.assertIn(b'Host: 10.1.1.242:9300', request)
            writer.write(b'HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nOK')
            await writer.drain()
            writer.close()

        service = await asyncio.start_server(upstream, '127.0.0.1', 0)
        port = service.sockets[0].getsockname()[1]
        original = asyncio.open_connection

        async def connect(host, target_port):
            return await original(host, port if target_port == 9010 else target_port)

        proxy = await asyncio.start_server(AuthentikForwarder().connect, '127.0.0.1', 0)
        try:
            with patch('authentik_forwarder.asyncio.open_connection', side_effect=connect):
                reader, writer = await original('127.0.0.1', proxy.sockets[0].getsockname()[1])
                writer.write(b'GET / HTTP/1.1\r\nHost: 10.1.1.242:9300\r\n\r\n')
                await writer.drain()
                response = await asyncio.wait_for(reader.read(), timeout=2)
                self.assertTrue(response.endswith(b'OK'))
                writer.close()
                await writer.wait_closed()
        finally:
            proxy.close()
            service.close()
            await proxy.wait_closed()
            await service.wait_closed()
