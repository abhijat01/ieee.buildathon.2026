import type { ExperienceType } from './ApiClient';
import type { ItemFormValues } from './PortfolioItemForm';

export type ProposalKind = 'text' | 'skills' | 'fields';
export type ProposedField = 'title' | 'type' | 'company' | 'startDate' | 'endDate';
export interface FieldChange { field: ProposedField; value: string; reason: string }
/** One change that the assistant proposes through a frontend tool. */
export type ProposedChange =
  | { kind: 'text'; text: string; label: string; reason: string }
  | { kind: 'skills'; skills: string[] }
  | { kind: 'fields'; changes: FieldChange[] };

export interface TextProposal { activityId: string; text: string; label: string; reason: string }
export interface SkillProposal { activityId: string; skill: string }
export interface FieldProposal extends FieldChange { activityId: string }
/** The line in the conversation for one tool call. It is done when no proposal of the call is open. */
export interface ProposalActivity { id: string; kind: ProposalKind; label: string; done: boolean }
/** A decision of the member. The assistant gets the last decisions with the next turn. */
export interface MemberDecision { proposal: string; outcome: 'accepted' | 'rejected' }
/** The result of an accept: the new proposals and the change for the form. */
export interface AcceptedProposal { proposals: AssistantProposals; change: Partial<ItemFormValues> }

interface ProposalState {
  text: TextProposal | null; skills: SkillProposal[]; fields: FieldProposal[];
  activities: ProposalActivity[]; decisions: MemberDecision[];
}

const OPEN_LABELS: Record<ProposalKind, string> = { text: 'Proposed a new text', skills: 'Proposed skills', fields: 'Proposed field changes' };
const REPLACED = 'Replaced by a newer proposal';

/**
 * Holds the open proposals of the assistant: one text, the skills, and the fields.
 * A proposal changes nothing. Each method returns new proposals and does not change this object.
 */
export class AssistantProposals {
  static readonly decisionLimit = 10;

  private constructor(private readonly state: ProposalState) {}

  static empty(): AssistantProposals {
    return new AssistantProposals({ text: null, skills: [], fields: [], activities: [], decisions: [] });
  }

  get text(): TextProposal | null { return this.state.text; }
  get skills(): readonly SkillProposal[] { return this.state.skills; }
  get fields(): readonly FieldProposal[] { return this.state.fields; }
  get decisions(): readonly MemberDecision[] { return this.state.decisions; }

  field(name: ProposedField): FieldProposal | undefined { return this.state.fields.find(proposal => proposal.field === name); }
  activity(id: string): ProposalActivity | undefined { return this.state.activities.find(activity => activity.id === id); }
  count(): number { return (this.state.text ? 1 : 0) + this.state.skills.length + this.state.fields.length; }

  /** Adds the proposals of one tool call. A new proposal replaces an open proposal for the same text or field. */
  propose(activityId: string, change: ProposedChange): AssistantProposals {
    if (this.activity(activityId)) return this;
    if (change.kind === 'text') return this.proposeText(activityId, change);
    if (change.kind === 'skills') return this.proposeSkills(activityId, change.skills);
    return this.proposeFields(activityId, change.changes);
  }

  acceptText(): AcceptedProposal {
    const proposal = this.state.text;
    if (!proposal) return { proposals: this, change: {} };
    return { proposals: this.decideText(proposal, 'accepted'), change: { text: proposal.text } };
  }

  rejectText(): AssistantProposals {
    return this.state.text ? this.decideText(this.state.text, 'rejected') : this;
  }

  acceptSkill(skill: string, current: string[]): AcceptedProposal {
    const proposal = this.state.skills.find(entry => entry.skill === skill);
    if (!proposal) return { proposals: this, change: {} };
    return { proposals: this.decideSkill(proposal, 'accepted'), change: { skills: [...current, skill] } };
  }

  acceptAllSkills(current: string[]): AcceptedProposal {
    return this.state.skills.reduce<AcceptedProposal>((result, proposal) => {
      const next = result.proposals.acceptSkill(proposal.skill, result.change.skills ?? current);
      return { proposals: next.proposals, change: { ...result.change, ...next.change } };
    }, { proposals: this, change: {} });
  }

  rejectSkill(skill: string): AssistantProposals {
    const proposal = this.state.skills.find(entry => entry.skill === skill);
    return proposal ? this.decideSkill(proposal, 'rejected') : this;
  }

  acceptField(name: ProposedField): AcceptedProposal {
    const proposal = this.field(name);
    if (!proposal) return { proposals: this, change: {} };
    const change: Partial<ItemFormValues> = name === 'type' ? { type: proposal.value as ExperienceType } : { [name]: proposal.value };
    return { proposals: this.decideField(proposal, 'accepted'), change };
  }

  rejectField(name: ProposedField): AssistantProposals {
    const proposal = this.field(name);
    return proposal ? this.decideField(proposal, 'rejected') : this;
  }

  private proposeText(activityId: string, change: { text: string; label: string; reason: string }): AssistantProposals {
    const replaced = this.state.text ? [this.state.text.activityId] : [];
    const text = { activityId, text: change.text, label: change.label, reason: change.reason };
    return this.next({ text, activities: this.opened(activityId, 'text') }, replaced, REPLACED);
  }

  private proposeSkills(activityId: string, skills: string[]): AssistantProposals {
    const known = new Set(this.state.skills.map(proposal => proposal.skill.toLowerCase()));
    const added: SkillProposal[] = [];
    for (const skill of skills) {
      if (known.has(skill.toLowerCase())) continue;
      known.add(skill.toLowerCase());
      added.push({ activityId, skill });
    }
    if (!added.length) return this;
    return this.next({ skills: [...this.state.skills, ...added], activities: this.opened(activityId, 'skills') }, [], REPLACED);
  }

  private proposeFields(activityId: string, changes: FieldChange[]): AssistantProposals {
    const names = new Set(changes.map(change => change.field));
    const replaced = this.state.fields.filter(proposal => names.has(proposal.field)).map(proposal => proposal.activityId);
    const kept = this.state.fields.filter(proposal => !names.has(proposal.field));
    const added = [...names].map(name => ({ ...changes.find(change => change.field === name)!, activityId }));
    return this.next({ fields: [...kept, ...added], activities: this.opened(activityId, 'fields') }, replaced, REPLACED);
  }

  private decideText(proposal: TextProposal, outcome: MemberDecision['outcome']): AssistantProposals {
    return this.next({ text: null, decisions: this.decided(`Text: ${proposal.label}`, outcome) }, [proposal.activityId],
      outcome === 'accepted' ? 'You accepted the new text' : 'You rejected the new text');
  }

  private decideSkill(proposal: SkillProposal, outcome: MemberDecision['outcome']): AssistantProposals {
    return this.next({ skills: this.state.skills.filter(entry => entry !== proposal),
      decisions: this.decided(`Skill: ${proposal.skill}`, outcome) }, [proposal.activityId], 'You reviewed the skills');
  }

  private decideField(proposal: FieldProposal, outcome: MemberDecision['outcome']): AssistantProposals {
    return this.next({ fields: this.state.fields.filter(entry => entry !== proposal),
      decisions: this.decided(`Field ${proposal.field}: ${proposal.value || 'empty'}`, outcome) }, [proposal.activityId], 'You reviewed the field changes');
  }

  private opened(id: string, kind: ProposalKind): ProposalActivity[] {
    return [...this.state.activities, { id, kind, label: OPEN_LABELS[kind], done: false }];
  }

  private decided(proposal: string, outcome: MemberDecision['outcome']): MemberDecision[] {
    return [...this.state.decisions, { proposal, outcome }].slice(-AssistantProposals.decisionLimit);
  }

  /** Applies a change. Then it closes each given activity that has no open proposal, with the done text. */
  private next(change: Partial<ProposalState>, activityIds: string[], doneLabel: string): AssistantProposals {
    const state = { ...this.state, ...change };
    const open = new Set([state.text?.activityId, ...state.skills.map(entry => entry.activityId), ...state.fields.map(entry => entry.activityId)]);
    const activities = state.activities.map(activity => activityIds.includes(activity.id) && !open.has(activity.id) && !activity.done
      ? { ...activity, label: doneLabel, done: true } : activity);
    return new AssistantProposals({ ...state, activities });
  }
}
