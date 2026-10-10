import { afterEach, expect, test, vi } from 'vitest';
import { ApiClient, AuthenticationRequired } from './ApiClient';
afterEach(() => vi.unstubAllGlobals());
class ApiFixture {
  static async client() {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'token', csrfHeader: 'X-CSRF-TOKEN' })));
    vi.stubGlobal('fetch', fetch); const api = new ApiClient(); await api.loadSession(); return { api, fetch };
  }
}
test('note calls use typed bodies and session CSRF headers', async () => {
  const { api, fetch } = await ApiFixture.client();
  const note = { id: 'note', title: 'Idea', body: 'Text', createdAt: '2026-10-09T10:00:00Z' };
  fetch.mockResolvedValueOnce(new Response(JSON.stringify(note)));
  expect(await api.saveNote('Idea', 'Text')).toEqual(note);
  const [path, options] = fetch.mock.calls[1];
  expect(path).toBe('/api/notes');
  expect(options).toMatchObject({ credentials: 'same-origin', method: 'POST', headers: { 'X-CSRF-TOKEN': 'token' } });
  expect(JSON.parse(options.body)).toEqual({ title: 'Idea', body: 'Text' });
});
test('expired authentication and server errors remain distinct', async () => {
  const { api, fetch } = await ApiFixture.client();
  fetch.mockResolvedValueOnce(new Response('', { status: 401 }));
  await expect(api.notes()).rejects.toBeInstanceOf(AuthenticationRequired);
  fetch.mockResolvedValueOnce(new Response('', { status: 503 }));
  await expect(api.notes()).rejects.not.toBeInstanceOf(AuthenticationRequired);
});
test('calls before sign-in require authentication', () => {
  expect(() => new ApiClient().headers()).toThrow(AuthenticationRequired);
});
