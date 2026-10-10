import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessageId } from './MessageId';

describe('message identifiers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('creates unique UUIDs when randomUUID is unavailable over LAN HTTP', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
    const ids = Array.from({ length: 100 }, () => MessageId.create());
    expect(new Set(ids).size).toBe(100);
    for (const id of ids) expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  });
});
