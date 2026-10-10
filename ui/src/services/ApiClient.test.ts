import { afterEach, expect, test, vi } from 'vitest';
import { ApiClient, AuthenticationRequired, ExperienceRequestError } from './ApiClient';
afterEach(() => vi.unstubAllGlobals());
class ApiFixture {
  static async client() {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'token', csrfHeader: 'X-CSRF-TOKEN' })));
    vi.stubGlobal('fetch', fetch); const api = new ApiClient(); await api.loadSession(); return { api, fetch };
  }
}
test('experience calls use typed bodies and session CSRF headers', async () => {
  const { api, fetch } = await ApiFixture.client();
  const fields = { company: 'Acme', projectName: 'Edited', startDate: '2022', endDate: null, description: 'Reviewed' };
  fetch.mockResolvedValueOnce(new Response(JSON.stringify(fields)));
  expect(await api.analyzeExperience({ type: 'PROJECT', originalInput: 'Original text' })).toEqual(fields);
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'entry', ...fields })));
  await api.saveExperience({ type: 'PROJECT', originalInput: 'Original text', ...fields });
  const [path, options] = fetch.mock.calls[2];
  expect(path).toBe('/api/experiences');
  expect(options).toMatchObject({ credentials: 'same-origin', method: 'POST', headers: { 'X-CSRF-TOKEN': 'token' } });
  expect(JSON.parse(options.body)).toEqual({ type: 'PROJECT', originalInput: 'Original text', ...fields });
});
test('field errors and expired authentication remain distinct', async () => {
  const { api, fetch } = await ApiFixture.client();
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Check fields', fields: { startDate: 'Invalid date' } }), { status: 400 }));
  await expect(api.analyzeExperience({ type: 'PROJECT', originalInput: 'text' })).rejects.toMatchObject({ fields: { startDate: 'Invalid date' } });
  fetch.mockResolvedValueOnce(new Response('', { status: 401 }));
  await expect(api.analyzeExperience({ type: 'PROJECT', originalInput: 'text' })).rejects.toBeInstanceOf(AuthenticationRequired);
  fetch.mockResolvedValueOnce(new Response('', { status: 503 }));
  await expect(api.analyzeExperience({ type: 'PROJECT', originalInput: 'text' })).rejects.toBeInstanceOf(ExperienceRequestError);
});
