import { describe, expect, it, vi } from 'vitest';
import { BrowserTools } from './BrowserTools';

class StorageStub { private values = new Map<string, string>(); setItem(key: string, value: string) { this.values.set(key, value); } getItem(key: string) { return this.values.get(key) ?? null; } }

describe('Browser tools', () => {
  it('updates the theme and persists the result', () => {
    vi.stubGlobal('localStorage', new StorageStub());
    vi.stubGlobal('document', { documentElement: { dataset: {}, style: {} } });
    const changed = vi.fn();
    const result = new BrowserTools(changed).execute('setTheme', '{"theme":"dark"}');
    expect(result).toEqual({ status: 'success', theme: 'dark' });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('ieee-theme')).toBe('dark');
    expect(changed).toHaveBeenCalledWith('dark');
  });
  it('rejects unknown tools and invalid arguments', () => {
    const tools = new BrowserTools(vi.fn());
    expect(() => tools.execute('deleteNotes', '{}')).toThrow('not supported');
    expect(() => tools.execute('setTheme', '{"theme":"unknown"}')).toThrow('light or dark');
    expect(() => tools.execute('setTheme', 'null')).toThrow('light or dark');
  });
});
