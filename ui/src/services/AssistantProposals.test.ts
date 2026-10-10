import { describe, expect, it } from 'vitest';
import { AssistantProposals, type ProposedChange } from './AssistantProposals';

const text = (value: string, label = 'Improved text'): ProposedChange => ({ kind: 'text', text: value, label, reason: 'More active verbs.' });
const skills = (...values: string[]): ProposedChange => ({ kind: 'skills', skills: values });
const endDate: ProposedChange = { kind: 'fields', changes: [{ field: 'endDate', value: '2023-06', reason: 'The text says so.' }] };

describe('AssistantProposals', () => {
  it('starts empty and counts each open proposal', () => {
    expect(AssistantProposals.empty().count()).toBe(0);
    const proposals = AssistantProposals.empty().propose('c1', text('New')).propose('c2', skills('Docker', 'Kubernetes')).propose('c3', endDate);
    expect(proposals.count()).toBe(4);
    expect(proposals.activity('c1')).toEqual({ id: 'c1', kind: 'text', label: 'Proposed a new text', done: false });
    expect(proposals.activity('c2')?.label).toBe('Proposed skills');
    expect(proposals.activity('c3')?.label).toBe('Proposed field changes');
  });

  it('accepts the text: gives the form change and the done text', () => {
    const { proposals, change } = AssistantProposals.empty().propose('c1', text('New text')).acceptText();
    expect(change).toEqual({ text: 'New text' });
    expect(proposals.text).toBeNull();
    expect(proposals.count()).toBe(0);
    expect(proposals.activity('c1')).toMatchObject({ label: 'You accepted the new text', done: true });
    expect(proposals.decisions).toEqual([{ proposal: 'Text: Improved text', outcome: 'accepted' }]);
  });

  it('rejects the text: no form change and the done text', () => {
    const proposals = AssistantProposals.empty().propose('c1', text('New text')).rejectText();
    expect(proposals.text).toBeNull();
    expect(proposals.activity('c1')).toMatchObject({ label: 'You rejected the new text', done: true });
    expect(proposals.decisions).toEqual([{ proposal: 'Text: Improved text', outcome: 'rejected' }]);
  });

  it('replaces the open text proposal with a newer proposal', () => {
    const proposals = AssistantProposals.empty().propose('c1', text('First')).propose('c2', text('Second', 'Shorter text'));
    expect(proposals.text).toMatchObject({ activityId: 'c2', text: 'Second', label: 'Shorter text' });
    expect(proposals.count()).toBe(1);
    expect(proposals.activity('c1')).toMatchObject({ label: 'Replaced by a newer proposal', done: true });
    expect(proposals.activity('c2')?.done).toBe(false);
  });

  it('accepts one skill and rejects one skill, and closes the line after the last decision', () => {
    const start = AssistantProposals.empty().propose('c1', skills('Kubernetes', 'Docker'));
    const accepted = start.acceptSkill('Kubernetes', ['Python']);
    expect(accepted.change).toEqual({ skills: ['Python', 'Kubernetes'] });
    expect(accepted.proposals.activity('c1')?.done).toBe(false);
    const done = accepted.proposals.rejectSkill('Docker');
    expect(done.skills).toEqual([]);
    expect(done.activity('c1')).toMatchObject({ label: 'You reviewed the skills', done: true });
    expect(done.decisions).toEqual([{ proposal: 'Skill: Kubernetes', outcome: 'accepted' }, { proposal: 'Skill: Docker', outcome: 'rejected' }]);
  });

  it('accepts all skills at once and does not propose a skill two times', () => {
    const start = AssistantProposals.empty().propose('c1', skills('Kubernetes')).propose('c2', skills('kubernetes', 'Docker'));
    expect(start.skills.map(proposal => proposal.skill)).toEqual(['Kubernetes', 'Docker']);
    expect(start.propose('c3', skills('DOCKER')).activity('c3')).toBeUndefined();
    const { proposals, change } = start.acceptAllSkills(['Python']);
    expect(change).toEqual({ skills: ['Python', 'Kubernetes', 'Docker'] });
    expect(proposals.count()).toBe(0);
    expect(proposals.activity('c1')?.done && proposals.activity('c2')?.done).toBe(true);
  });

  it('accepts and rejects a field change, and a newer change replaces the open change of the same field', () => {
    const start = AssistantProposals.empty().propose('c1', endDate);
    expect(start.acceptField('endDate').change).toEqual({ endDate: '2023-06' });
    expect(start.acceptField('endDate').proposals.activity('c1')).toMatchObject({ label: 'You reviewed the field changes', done: true });
    expect(start.rejectField('endDate').field('endDate')).toBeUndefined();
    expect(start.rejectField('endDate').decisions).toEqual([{ proposal: 'Field endDate: 2023-06', outcome: 'rejected' }]);
    const newer = start.propose('c2', { kind: 'fields', changes: [{ field: 'endDate', value: '2023-07', reason: '' }, { field: 'type', value: 'WORK', reason: '' }] });
    expect(newer.field('endDate')).toMatchObject({ activityId: 'c2', value: '2023-07' });
    expect(newer.activity('c1')).toMatchObject({ label: 'Replaced by a newer proposal', done: true });
    expect(newer.acceptField('type').change).toEqual({ type: 'WORK' });
  });

  it('a decision without an open proposal changes nothing, and a tool call counts one time', () => {
    const empty = AssistantProposals.empty();
    expect(empty.acceptText()).toEqual({ proposals: empty, change: {} });
    expect(empty.rejectText()).toBe(empty);
    expect(empty.rejectSkill('Docker')).toBe(empty);
    expect(empty.acceptField('title').change).toEqual({});
    const once = empty.propose('c1', text('New'));
    expect(once.propose('c1', text('Other'))).toBe(once);
  });

  it('keeps only the last decisions and does not change the object that it comes from', () => {
    const start = AssistantProposals.empty().propose('c1', text('New'));
    start.rejectText();
    expect(start.count()).toBe(1);
    let proposals = AssistantProposals.empty();
    for (let index = 0; index < 12; index++) proposals = proposals.propose(`c${index}`, skills(`Skill ${index}`)).rejectSkill(`Skill ${index}`);
    expect(proposals.decisions).toHaveLength(AssistantProposals.decisionLimit);
    expect(proposals.decisions.at(-1)).toEqual({ proposal: 'Skill: Skill 11', outcome: 'rejected' });
  });
});
