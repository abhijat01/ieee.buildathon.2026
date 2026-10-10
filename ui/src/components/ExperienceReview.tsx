import { Component, type KeyboardEvent } from 'react';
import { ArrowRight, Check, Pencil, Sparkles, TriangleAlert, Undo, X } from 'lucide-react';
import type { ExtractedFields } from '../services/ApiClient';
import { ExperienceDates } from '../services/ExperienceDates';
import { ExperienceDrafts, type ExperienceDraft } from '../services/ExperienceDraft';
import { ImprovePanel } from './ImprovePanel';
import { MarkdownView } from './MarkdownView';

interface Props {
  draft: ExperienceDraft; onDraft: (change: Partial<ExperienceDraft>) => void; onOpenItem: (id: string) => void;
  onImprove: () => void; onSave: () => void; onCancel: () => void;
}
type TextField = 'title' | 'company' | 'startDate' | 'endDate';

/** The review step: the member checks the extracted fields, the duplicates, and the text before the save. */
export class ExperienceReview extends Component<Props, { skill: string }> {
  state = { skill: '' };

  private change(change: Partial<ExtractedFields>): void {
    const { draft, onDraft } = this.props;
    if (draft.fields) onDraft({ fields: { ...draft.fields, ...change } });
  }

  private addSkill = (event: KeyboardEvent<HTMLInputElement>): void => {
    const skill = this.state.skill.trim();
    if (event.key !== 'Enter' || !skill || !this.props.draft.fields) return;
    event.preventDefault();
    this.change({ skills: [...this.props.draft.fields.skills, skill] });
    this.setState({ skill: '' });
  };

  private field(name: TextField, label: string, placeholder: string, full = false) {
    const value = this.props.draft.fields?.[name] ?? '';
    return <div className={full ? 'field full' : 'field'}><label htmlFor={`field-${name}`}>{label}{!value && <span className="missing">Not found. Add it if you know it.</span>}</label>
      <input id={`field-${name}`} className={value ? '' : 'is-missing'} value={value} placeholder={placeholder}
        maxLength={name === 'title' || name === 'company' ? ExperienceDrafts.nameLimit : ExperienceDrafts.dateLimit} onChange={event => this.change({ [name]: event.target.value })}/></div>;
  }

  private duplicates() {
    const { duplicates } = this.props.draft;
    if (!duplicates.length) return <div className="clear-note" role="status"><Check size={15}/> The app found no similar experience in your portfolio.</div>;
    const count = duplicates.length === 1 ? '1 similar experience' : `${duplicates.length} similar experiences`;
    return <section className="duplicate-banner" role="status" aria-label="Possible duplicates">
      <h2><TriangleAlert size={16}/> Possible duplicate: {count} in your portfolio</h2>
      <p>Open an entry to compare it. You can still save this experience.</p>
      <ul className="duplicate-list">{duplicates.map(match => <li key={match.id}><button type="button" className="duplicate-link" onClick={() => this.props.onOpenItem(match.id)}>
        <span><strong>{match.title}</strong><small>{[match.company, ExperienceDates.period(match.startDate, match.endDate), match.reason].filter(Boolean).join(' · ')}</small></span>
        <span className={match.level === 'VERY_SIMILAR' ? 'match high' : 'match some'}>{match.level === 'VERY_SIMILAR' ? 'Very similar' : 'Some overlap'}</span><ArrowRight size={15}/></button></li>)}</ul>
    </section>;
  }

  render() {
    const { draft, onDraft, onImprove, onSave, onCancel } = this.props;
    const fields = draft.fields;
    if (!fields) return null;
    const busy = draft.busy !== null;
    return <>
      {this.duplicates()}
      <div className="review-layout">
        <section className="panel" aria-label="Extracted information">
          <div className="panel-heading"><h2>Extracted information</h2><span className="status-tag ai"><Sparkles size={11}/> Found by AI</span></div>
          <p className="hint" style={{ marginBottom: 16 }}>The app uses these fields to index the experience. Correct them if necessary.</p>
          <div className="field-grid">
            {this.field('title', 'Title', 'Example: Atlas analytics dashboard', true)}
            <div className="field full"><span className="label" id="type-label">Type</span>
              <div className="segmented" role="group" aria-labelledby="type-label">
                <button type="button" aria-pressed={fields.type === 'PROJECT'} onClick={() => this.change({ type: 'PROJECT' })}>Project</button>
                <button type="button" aria-pressed={fields.type === 'WORK'} onClick={() => this.change({ type: 'WORK' })}>Work experience</button></div></div>
            {this.field('company', 'Company', 'Example: Acme Corp', true)}
            {this.field('startDate', 'Start date', 'YYYY-MM')}
            {this.field('endDate', 'End date', 'Empty for current work')}
            <div className="field full"><label htmlFor="skill-input">Skills</label>
              <div className="skill-box">{fields.skills.map((skill, index) => <span className="chip" key={`${skill}-${index}`}>{skill}
                <button type="button" aria-label={`Remove ${skill}`} onClick={() => this.change({ skills: fields.skills.filter((_, position) => position !== index) })}><X size={11}/></button></span>)}
                <input id="skill-input" value={this.state.skill} maxLength={ExperienceDrafts.skillLimit} placeholder="Add a skill, then press Enter"
                  onChange={event => this.setState({ skill: event.target.value })} onKeyDown={this.addSkill}/></div></div>
          </div>
        </section>
        <section className="panel" aria-label="Experience text">
          <div className="panel-heading"><h2>Experience text</h2>{draft.improvedInUse
            ? <span className="status-tag ai"><Sparkles size={11}/> Improved by AI</span>
            : <span className="status-tag"><Check size={11}/> Your original text, unchanged</span>}</div>
          <MarkdownView text={draft.text}/>
          <div className="editor-footer">{draft.improvedInUse
            ? <button type="button" className="text-button" disabled={busy} onClick={() => onDraft({ text: draft.original, improvedInUse: false })}><Undo size={14}/> Restore my original text</button>
            : <button type="button" className="text-button" disabled={busy} onClick={() => onDraft({ step: 'write', tab: 'write', text: draft.original, improveOpen: false, proposal: null })}><Pencil size={14}/> Edit text</button>}
            {!draft.improveOpen && <button type="button" className="outline-button" disabled={busy} onClick={() => onDraft({ improveOpen: true })}><Sparkles size={15}/> Improve with AI</button>}</div>
        </section>
      </div>
      {draft.improveOpen && <ImprovePanel draft={draft} onDraft={onDraft} onImprove={onImprove}/>}
      <div className="actions"><button type="button" className="text-button" onClick={onCancel}>Cancel</button><span className="spacer"/>
        <span className="hint">The app saves the text and the fields above.</span>
        <button type="button" className="primary-button" disabled={busy || draft.proposal !== null} onClick={onSave}><Check size={16}/> {draft.busy === 'save' ? 'Save…' : 'Approve & save'}</button></div>
    </>;
  }
}
