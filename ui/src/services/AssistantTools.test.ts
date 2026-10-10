import { describe, expect, it } from 'vitest';
import { AssistantTools, type ToolCall } from './AssistantTools';
import type { ItemFormValues } from './PortfolioItemForm';

const values: ItemFormValues = { title: 'Atlas', type: 'PROJECT', company: 'Acme Corp', startDate: '2022-03', endDate: '2023-03',
  skills: ['Python', 'React'], text: 'I built Atlas.' };
const call = (name: string, args: object | string): ToolCall => ({ id: 'call-1', name, args: typeof args === 'string' ? args : JSON.stringify(args) });
const SHOWN = { status: 'shown', message: 'The form shows the proposal. The member did not decide yet.' };

describe('AssistantTools', () => {
  it('declares the three frontend tools by name', () => {
    expect(AssistantTools.definitions.map(tool => tool.name)).toEqual(['proposeText', 'proposeSkills', 'proposeFields']);
    expect(AssistantTools.supports('proposeText')).toBe(true);
    expect(AssistantTools.supports('saveItem')).toBe(false);
  });

  it('changes a proposeText call to a text proposal', () => {
    const outcome = AssistantTools.read(call('proposeText', { text: 'Built Atlas.', label: ' Improved text ', reason: 'More active verbs.' }), values);
    expect(outcome).toEqual({ change: { kind: 'text', text: 'Built Atlas.', label: 'Improved text', reason: 'More active verbs.' }, result: SHOWN });
  });

  it('changes a proposeSkills call to skill proposals without the skills that the form has', () => {
    const outcome = AssistantTools.read(call('proposeSkills', { skills: ['python', ' Kubernetes ', 'Docker', 'docker'] }), values);
    expect(outcome).toEqual({ change: { kind: 'skills', skills: ['Kubernetes', 'Docker'] }, result: SHOWN });
  });

  it('changes a proposeFields call to field proposals without the values that the form has', () => {
    const changes = [{ field: 'endDate', value: '2023-06', reason: 'The text says so.' }, { field: 'type', value: 'WORK', reason: '' },
      { field: 'company', value: 'Acme Corp', reason: 'Same value.' }];
    const outcome = AssistantTools.read(call('proposeFields', { changes }), values);
    expect(outcome.result).toEqual(SHOWN);
    expect(outcome.change).toEqual({ kind: 'fields', changes: changes.slice(0, 2) });
    expect(AssistantTools.read(call('proposeFields', { changes: [{ field: 'endDate', value: '', reason: 'Current work.' }] }), values).change)
      .toEqual({ kind: 'fields', changes: [{ field: 'endDate', value: '', reason: 'Current work.' }] });
  });

  it.each([
    ['proposeText', 'not json', 'not valid JSON'],
    ['proposeText', '[1]', 'JSON object'],
    ['proposeText', { text: '', label: 'L', reason: 'R' }, 'text must be'],
    ['proposeText', { text: 'x'.repeat(4001), label: 'L', reason: 'R' }, 'text must be'],
    ['proposeText', { text: 'Text', label: 'L'.repeat(41), reason: 'R' }, 'label must be'],
    ['proposeText', { text: 'Text', label: 'L', reason: 'R'.repeat(201) }, 'reason must be'],
    ['proposeText', { text: 42, label: 'L', reason: 'R' }, 'text must be'],
    ['proposeSkills', { skills: [] }, 'skills must be a list'],
    ['proposeSkills', { skills: 'Docker' }, 'skills must be a list'],
    ['proposeSkills', { skills: Array(21).fill('Docker') }, 'skills must be a list'],
    ['proposeSkills', { skills: ['s'.repeat(41)] }, 'Each skill must be'],
    ['proposeSkills', { skills: ['Python', 'react'] }, 'already has each of these skills'],
    ['proposeFields', { changes: [] }, 'changes must be a list'],
    ['proposeFields', { changes: [{ field: 'owner', value: 'x', reason: '' }] }, 'field must be one of'],
    ['proposeFields', { changes: [{ field: 'type', value: 'HOBBY', reason: '' }] }, 'PROJECT or WORK'],
    ['proposeFields', { changes: [{ field: 'startDate', value: 'March 2022', reason: '' }] }, 'YYYY-MM'],
    ['proposeFields', { changes: [{ field: 'startDate', value: '', reason: '' }] }, 'YYYY-MM'],
    ['proposeFields', { changes: [{ field: 'endDate', value: '2023-13', reason: '' }] }, 'YYYY-MM'],
    ['proposeFields', { changes: [{ field: 'title', value: 'x'.repeat(161), reason: '' }] }, 'value must be'],
    ['proposeFields', { changes: [{ field: 'title', value: 'A', reason: '' }, { field: 'title', value: 'B', reason: '' }] }, 'at most one change'],
    ['proposeFields', { changes: [{ field: 'title', value: 'Atlas', reason: '' }] }, 'already have these values'],
    ['proposeFields', { changes: ['title'] }, 'field must be one of'],
    ['saveItem', {}, 'not supported'],
  ])('gives an error result and no proposal for %s with %j', (name, args, message) => {
    const outcome = AssistantTools.read(call(name, args), values);
    expect(outcome.change).toBeNull();
    expect(outcome.result.status).toBe('error');
    expect(outcome.result.message).toContain(message);
  });

  it('does not apply the save rules: an empty title and a late start date are valid proposals', () => {
    const changes = [{ field: 'title', value: '', reason: '' }, { field: 'startDate', value: '2030-01', reason: '' }];
    expect(AssistantTools.read(call('proposeFields', { changes }), values).result).toEqual(SHOWN);
  });
});
