import { describe, expect, it } from 'vitest';
import type { PortfolioItem } from './ApiClient';
import { PortfolioItemForm } from './PortfolioItemForm';

const saved: PortfolioItem = { id: 'a1', type: 'PROJECT', title: 'Atlas', company: null, startDate: '2022-03', endDate: null,
  skills: ['Python', 'React'], text: 'I built Atlas.', createdAt: '2026-09-12T10:00:00Z', updatedAt: '2026-09-12T10:00:00Z' };

describe('PortfolioItemForm', () => {
  it('starts with the saved values and has no unsaved changes', () => {
    const form = new PortfolioItemForm(saved);
    expect(form.values).toEqual({ title: 'Atlas', type: 'PROJECT', company: '', startDate: '2022-03', endDate: '', skills: ['Python', 'React'], text: 'I built Atlas.' });
    expect(form.hasChanges()).toBe(false);
  });

  it.each([
    [{ title: 'Atlas 2' }], [{ type: 'WORK' as const }], [{ company: 'Acme' }], [{ startDate: '2022-04' }], [{ endDate: '2023-06' }],
    [{ text: 'I built Atlas. ' }], [{ skills: ['Python'] }], [{ skills: ['React', 'Python'] }], [{ skills: ['Python', 'React', 'Docker'] }],
  ])('has unsaved changes after the change %j', change => {
    expect(new PortfolioItemForm(saved).with(change).hasChanges()).toBe(true);
  });

  it('has no unsaved changes when the member restores the saved values', () => {
    const form = new PortfolioItemForm(saved).with({ title: 'Other', skills: ['Python'] });
    expect(form.with({ title: 'Atlas', skills: ['Python', 'React'] }).hasChanges()).toBe(false);
  });

  it('does not change the saved item or the form that it comes from', () => {
    const form = new PortfolioItemForm(saved);
    const changed = form.with({ skills: [...form.values.skills, 'Docker'] });
    expect(form.values.skills).toEqual(['Python', 'React']);
    expect(saved.skills).toEqual(['Python', 'React']);
    expect(changed.saved).toBe(saved);
  });

  it('after a save, shows the saved item and keeps a change that the member made during the request', () => {
    const sent = new PortfolioItemForm(saved).with({ title: '  Atlas 2  ' });
    const stored = { ...saved, title: 'Atlas 2', updatedAt: '2026-10-10T10:00:00Z' };
    const unchanged = sent.afterSave(stored, sent);
    expect(unchanged.values.title).toBe('Atlas 2');
    expect(unchanged.hasChanges()).toBe(false);
    const late = sent.with({ company: 'Acme' }).afterSave(stored, sent);
    expect(late.saved).toBe(stored);
    expect(late.values).toMatchObject({ title: '  Atlas 2  ', company: 'Acme' });
    expect(late.hasChanges()).toBe(true);
  });

  it('gives the save request with the text as the final text and empty fields as null', () => {
    const request = new PortfolioItemForm(saved).with({ company: 'Acme', text: 'New text' }).request();
    expect(request).toEqual({ title: 'Atlas', type: 'PROJECT', company: 'Acme', startDate: '2022-03', endDate: null,
      skills: ['Python', 'React'], finalText: 'New text' });
    expect(new PortfolioItemForm(saved).request().company).toBeNull();
  });
});
