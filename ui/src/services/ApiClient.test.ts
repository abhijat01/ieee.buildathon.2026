import { afterEach, expect, test, vi } from 'vitest';
import { ApiClient, ApiError, AuthenticationRequired } from './ApiClient';
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
test('portfolio calls send typed bodies and the CSRF header', async () => {
  const { api, fetch } = await ApiFixture.client();
  const fields = { title: 'Atlas', type: 'PROJECT' as const, company: 'Acme', startDate: '2022-03', endDate: null, skills: ['Python'] };
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ fields, duplicates: [] })));
  expect(await api.analyzeExperience('My text')).toEqual({ fields, duplicates: [] });
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ text: 'Better', note: 'Shorter.' })));
  expect(await api.improveExperience('My text', 'Make it shorter')).toEqual({ text: 'Better', note: 'Shorter.' });
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'item', ...fields, text: 'Better', createdAt: '2026-10-09T10:00:00Z' })));
  await api.savePortfolioItem({ ...fields, originalText: 'My text', finalText: 'Better' });
  const calls = fetch.mock.calls.slice(1).map(([path, options]) => ({ path, body: JSON.parse(options.body), options }));
  expect(calls.map(call => call.path)).toEqual(['/api/portfolio/analyze', '/api/portfolio/improve', '/api/portfolio']);
  expect(calls[0].body).toEqual({ text: 'My text' });
  expect(calls[1].body).toEqual({ text: 'My text', instruction: 'Make it shorter' });
  expect(calls[2].body).toEqual({ ...fields, originalText: 'My text', finalText: 'Better' });
  for (const call of calls) expect(call.options).toMatchObject({ method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-TOKEN': 'token' } });
});
test('portfolio reads use the item identifier and the session cookie', async () => {
  const { api, fetch } = await ApiFixture.client();
  fetch.mockResolvedValueOnce(new Response('[]'));
  expect(await api.portfolioItems()).toEqual([]);
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'a/b' })));
  await api.portfolioItem('a/b');
  expect(fetch.mock.calls[1]).toEqual(['/api/portfolio', { credentials: 'same-origin' }]);
  expect(fetch.mock.calls[2][0]).toBe('/api/portfolio/a%2Fb');
});
test('resume calls send the CSRF header and the correct body', async () => {
  const { api, fetch } = await ApiFixture.client();
  const analysis = { jobTitle: 'Engineer', company: 'Contoso', requirements: ['Python'], keywords: ['Python'], items: [] };
  fetch.mockResolvedValueOnce(new Response(JSON.stringify(analysis)));
  expect(await api.analyzeJob('Job text')).toEqual(analysis);
  const resume = { markdown: '# Abhijat\n', fileName: 'resume-abhijat.md', descriptions: [],
    atsCheck: { keywords: { inResume: ['Python'], inExcludedItems: [], notInPortfolio: [] }, formatChecks: [] } };
  fetch.mockResolvedValueOnce(new Response(JSON.stringify(resume)));
  expect(await api.writeResume('Job text', ['Python'], ['p1', 'w1'])).toEqual(resume);
  const calls = fetch.mock.calls.slice(1).map(([path, options]) => ({ path, body: JSON.parse(options.body), options }));
  expect(calls.map(call => call.path)).toEqual(['/api/resume/analyze', '/api/resume/write']);
  expect(calls[0].body).toEqual({ jobText: 'Job text' });
  expect(calls[1].body).toEqual({ jobText: 'Job text', keywords: ['Python'], itemIds: ['p1', 'w1'] });
  for (const call of calls) expect(call.options).toMatchObject({ method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-TOKEN': 'token' } });
});
test('a 503 response of a resume call gives an ApiError with the server message', async () => {
  const { api, fetch } = await ApiFixture.client();
  const message = 'The AI is not available at this time. Your text is safe. Try again.';
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ message }), { status: 503 }));
  await expect(api.analyzeJob('Job text')).rejects.toMatchObject({ name: 'ApiError', message });
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ message }), { status: 503 }));
  await expect(api.writeResume('Job text', [], ['p1'])).rejects.toMatchObject({ name: 'ApiError', message });
  fetch.mockResolvedValueOnce(new Response('', { status: 401 }));
  await expect(api.writeResume('Job text', [], ['p1'])).rejects.toBeInstanceOf(AuthenticationRequired);
});
test('a rejected portfolio call gives the server message, and expired authentication stays distinct', async () => {
  const { api, fetch } = await ApiFixture.client();
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'The AI is not available at this time.' }), { status: 503 }));
  await expect(api.analyzeExperience('text')).rejects.toMatchObject({ name: 'ApiError', message: 'The AI is not available at this time.' });
  fetch.mockResolvedValueOnce(new Response('', { status: 500 }));
  await expect(api.improveExperience('text', '')).rejects.toBeInstanceOf(ApiError);
  fetch.mockResolvedValueOnce(new Response('', { status: 401 }));
  await expect(api.analyzeExperience('text')).rejects.toBeInstanceOf(AuthenticationRequired);
});
test('updatePortfolioItem sends PUT with the item identifier, the changed values, and the CSRF header', async () => {
  const { api, fetch } = await ApiFixture.client();
  const update = { title: 'Atlas', type: 'WORK' as const, company: null, startDate: '2022-03', endDate: null, skills: ['Python'], finalText: 'Better' };
  const saved = { id: 'a/b', ...update, text: 'Better', createdAt: '2026-09-12T10:00:00Z', updatedAt: '2026-10-10T10:00:00Z' };
  fetch.mockResolvedValueOnce(new Response(JSON.stringify(saved)));
  expect(await api.updatePortfolioItem('a/b', update)).toEqual(saved);
  const [path, options] = fetch.mock.calls[1];
  expect(path).toBe('/api/portfolio/a%2Fb');
  expect(options).toMatchObject({ method: 'PUT', credentials: 'same-origin', headers: { 'X-CSRF-TOKEN': 'token' } });
  expect(JSON.parse(options.body)).toEqual(update);
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Add a title before you save.' }), { status: 400 }));
  await expect(api.updatePortfolioItem('a1', update)).rejects.toMatchObject({ name: 'ApiError', message: 'Add a title before you save.' });
  fetch.mockResolvedValueOnce(new Response('', { status: 401 }));
  await expect(api.updatePortfolioItem('a1', update)).rejects.toBeInstanceOf(AuthenticationRequired);
});
