import { afterEach, expect, test, vi } from 'vitest';
import { ResumeFile } from './ResumeFile';

afterEach(() => vi.unstubAllGlobals());

test('the download uses the file name of the server and the text/markdown type', async () => {
  const link = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
  const append = vi.fn();
  const blobs: Blob[] = [];
  vi.stubGlobal('document', { createElement: vi.fn(() => link), body: { append } });
  vi.stubGlobal('URL', { createObjectURL: vi.fn((blob: Blob) => { blobs.push(blob); return 'blob:resume'; }), revokeObjectURL: vi.fn() });

  new ResumeFile('# Abhijat\n', 'resume-abhijat.md').download();

  expect(document.createElement).toHaveBeenCalledWith('a');
  expect(link).toMatchObject({ href: 'blob:resume', download: 'resume-abhijat.md' });
  expect(append).toHaveBeenCalledWith(link);
  expect(link.click).toHaveBeenCalledOnce();
  expect(link.remove).toHaveBeenCalledOnce();
  expect(blobs[0].type).toBe('text/markdown');
  expect(await blobs[0].text()).toBe('# Abhijat\n');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:resume');
});

test('the copy writes the Markdown to the clipboard, and a refused copy rejects', async () => {
  const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied'));
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  const file = new ResumeFile('# Abhijat\n', 'resume-abhijat.md');
  await file.copy();
  expect(writeText).toHaveBeenCalledWith('# Abhijat\n');
  await expect(file.copy()).rejects.toThrow('denied');
});
