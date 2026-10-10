import asyncio


class AuthentikForwarder:
    async def copy(self, reader, writer):
        try:
            while chunk := await reader.read(65536):
                writer.write(chunk)
                await writer.drain()
        finally:
            writer.close()

    async def connect(self, reader, writer):
        try:
            upstream_reader, upstream_writer = await asyncio.open_connection("127.0.0.1", 9010)
            await asyncio.gather(self.copy(reader, upstream_writer), self.copy(upstream_reader, writer))
        except (OSError, ConnectionError):
            writer.close()

    async def run(self):
        server = await asyncio.start_server(self.connect, "0.0.0.0", 9300)
        async with server:
            await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(AuthentikForwarder().run())
