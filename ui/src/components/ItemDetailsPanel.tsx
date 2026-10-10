import { Component, type KeyboardEvent } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import type { AssistantProposals, ProposedField } from '../services/AssistantProposals';
import { ExperienceDrafts } from '../services/ExperienceDraft';
import type { ItemFormValues } from '../services/PortfolioItemForm';

interface Props {
  values: ItemFormValues; proposals: AssistantProposals; onChange: (change: Partial<ItemFormValues>) => void;
  onField: (field: ProposedField, accept: boolean) => void; onSkill: (skill: string, accept: boolean) => void;
  onAllSkills: () => void;
}
type TextField = 'title' | 'company' | 'startDate' | 'endDate';

/** The title, type, company, date, and skill controls of the open item, with the proposals of the assistant. */
export class ItemDetailsPanel extends Component<Props, { skill: string }> {
  state = { skill: '' };

  private addSkill = (event: KeyboardEvent<HTMLInputElement>): void => {
    const skill = this.state.skill.trim();
    if (event.key !== 'Enter' || !skill) return;
    event.preventDefault();
    this.props.onChange({ skills: [...this.props.values.skills, skill] });
    this.setState({ skill: '' });
  };

  /** Shows a proposed value in the words of the form. */
  private shown(field: ProposedField, value: string): string {
    if (field === 'type') return value === 'PROJECT' ? 'Project' : 'Work experience';
    return value || 'an empty field';
  }

  private fieldProposal(field: ProposedField) {
    const proposal = this.props.proposals.field(field);
    if (!proposal) return null;
    return <div className="field-proposal" data-proposal="fields"><Sparkles size={13}/>
      <span>The assistant proposes <strong>{this.shown(field, proposal.value)}</strong>. {proposal.reason}</span>
      <span className="proposal-buttons">
        <button type="button" className="small-button" onClick={() => this.props.onField(field, false)}>Reject</button>
        <button type="button" className="small-button accept" onClick={() => this.props.onField(field, true)}><Check size={13}/> Accept</button></span></div>;
  }

  private field(name: TextField, label: string, placeholder: string, full = false) {
    const limit = name === 'title' || name === 'company' ? ExperienceDrafts.nameLimit : ExperienceDrafts.dateLimit;
    return <div className={full ? 'field full' : 'field'}><label htmlFor={`field-${name}`}>{label}</label>
      <input id={`field-${name}`} value={this.props.values[name]} placeholder={placeholder} maxLength={limit}
        onChange={event => this.props.onChange({ [name]: event.target.value })}/>{this.fieldProposal(name)}</div>;
  }

  private skills() {
    const { values, proposals, onChange, onSkill, onAllSkills } = this.props;
    const proposed = proposals.skills;
    return <div className="field full" data-proposal={proposed.length ? 'skills' : undefined}><label htmlFor="skill-input">Skills</label>
      <div className="skill-box">
        {values.skills.map((skill, index) => <span className="chip" key={`${skill}-${index}`}>{skill}
          <button type="button" aria-label={`Remove ${skill}`} onClick={() => onChange({ skills: values.skills.filter((_, position) => position !== index) })}><X size={11}/></button></span>)}
        {proposed.map(proposal => <span className="chip proposed" key={proposal.skill}>+ {proposal.skill}
          <button type="button" aria-label={`Accept ${proposal.skill}`} title="Accept" onClick={() => onSkill(proposal.skill, true)}><Check size={12}/></button>
          <button type="button" aria-label={`Reject ${proposal.skill}`} title="Reject" onClick={() => onSkill(proposal.skill, false)}><X size={12}/></button></span>)}
        <input id="skill-input" value={this.state.skill} maxLength={ExperienceDrafts.skillLimit} placeholder="Add a skill, then press Enter"
          onChange={event => this.setState({ skill: event.target.value })} onKeyDown={this.addSkill}/></div>
      {proposed.length > 0 && <div className="skill-proposal-note"><Sparkles size={13}/>
        <span>The assistant proposes the skills with a dashed line. Accept or reject each skill.</span>
        <button type="button" className="small-button" onClick={onAllSkills}>Accept all</button></div>}</div>;
  }

  render() {
    const { values, onChange } = this.props;
    return <section className="panel" aria-label="Details">
      <div className="panel-heading"><h2>Details</h2></div>
      <div className="field-grid">
        {this.field('title', 'Title', 'Example: Atlas analytics dashboard', true)}
        <div className="field full"><span className="label" id="type-label">Type</span>
          <div className="segmented" role="group" aria-labelledby="type-label">
            <button type="button" aria-pressed={values.type === 'PROJECT'} onClick={() => onChange({ type: 'PROJECT' })}>Project</button>
            <button type="button" aria-pressed={values.type === 'WORK'} onClick={() => onChange({ type: 'WORK' })}>Work experience</button></div>
          {this.fieldProposal('type')}</div>
        {this.field('company', 'Company', 'Example: Acme Corp', true)}
        {this.field('startDate', 'Start date', 'YYYY-MM')}
        {this.field('endDate', 'End date', 'Empty for current work')}
        {this.skills()}
      </div></section>;
  }
}
