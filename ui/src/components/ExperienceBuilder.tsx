import { Component, createRef, type FormEvent } from 'react';
import { ApiClient, AuthenticationRequired, ExperienceRequestError, type ExperienceFields, type ExperienceType } from '../services/ApiClient';

interface Props { api: ApiClient; onAuthExpired: () => void }
interface State { type: ExperienceType; input: string; originalInput: string; preview: ExperienceFields | null;
  busy: boolean; error: string | null; errors: Record<string, string>; success: string | null }

export class ExperienceBuilder extends Component<Props, State> {
  state: State = { type: 'PROJECT', input: '', originalInput: '', preview: null, busy: false, error: null, errors: {}, success: null };
  private active = false;
  private mounted = false;
  private heading = createRef<HTMLHeadingElement>();
  componentDidMount(): void { this.mounted = true; }
  componentWillUnmount(): void { this.mounted = false; }
  private failure(error: unknown): void {
    if (error instanceof AuthenticationRequired) { this.props.onAuthExpired(); return; }
    this.setState({ error: error instanceof Error ? error.message : 'The request failed. Please retry.',
      errors: error instanceof ExperienceRequestError ? error.fields : {} });
  }
  private analyze = async (event: FormEvent): Promise<void> => {
    event.preventDefault(); if (this.active) return;
    const originalInput = this.state.input.trim();
    if (!originalInput || originalInput.length > 4000) { this.setState({ error: 'Enter 1–4,000 characters.', errors: { originalInput: 'Enter 1–4,000 characters.' } }); return; }
    this.active = true; this.setState({ busy: true, error: null, errors: {}, success: null });
    try {
      const preview = await this.props.api.analyzeExperience({ type: this.state.type, originalInput });
      if (this.mounted) this.setState({ preview, originalInput }, () => this.heading.current?.focus());
    } catch (error) { if (this.mounted) this.failure(error); }
    finally { this.active = false; if (this.mounted) this.setState({ busy: false }); }
  };
  private save = async (event: FormEvent): Promise<void> => {
    event.preventDefault(); if (this.active || !this.state.preview) return;
    this.active = true; this.setState({ busy: true, error: null, errors: {} });
    const fields = this.state.preview;
    try {
      const saved = await this.props.api.saveExperience({ type: this.state.type, originalInput: this.state.originalInput, ...fields });
      if (!saved.id) throw new Error('The server did not confirm the save. Please retry.');
      if (this.mounted) this.setState({ preview: null, input: '', originalInput: '', success: 'Experience saved.' });
    } catch (error) { if (this.mounted) this.failure(error); }
    finally { this.active = false; if (this.mounted) this.setState({ busy: false }); }
  };
  private edit(field: keyof ExperienceFields, value: string): void {
    if (this.state.preview) this.setState({ preview: { ...this.state.preview, [field]: value || null } });
  }
  private field(field: keyof ExperienceFields, label: string, limit: number) {
    const value = this.state.preview?.[field] ?? '';
    const error = this.state.errors[field];
    const id = `experience-${field}`;
    return <div className={'experience-field' + (field === 'description' ? ' full-width' : '')} key={field}>
      <label htmlFor={id}>{label} {!value.trim() && <span className="missing-value">Missing</span>}</label>
      {field === 'description' ? <textarea id={id} rows={5} maxLength={limit} disabled={this.state.busy} value={value} onChange={event => this.edit(field, event.target.value)} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}/> :
        <input id={id} maxLength={limit} disabled={this.state.busy} value={value} onChange={event => this.edit(field, event.target.value)} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : field.endsWith('Date') ? 'date-guidance' : undefined}/>}
      {error && <span className="field-error" id={`${id}-error`}>{error}</span>}
    </div>;
  }
  render() {
    const { preview, busy, error, success, errors } = this.state;
    return <section className="experience-builder" aria-label="Resume Builder">
      <p>Describe one project or professional experience. Review the extracted details before you save.</p>
      {success && <p className="experience-success" role="status">{success}</p>}
      {error && <p className="error-banner" role="alert">{error}</p>}
      {!preview ? <form onSubmit={this.analyze}>
        <label htmlFor="experience-type">Experience type</label>
        <select id="experience-type" value={this.state.type} disabled={busy} onChange={event => this.setState({ type: event.target.value as ExperienceType })}>
          <option value="PROJECT">Project</option><option value="PROFESSIONAL">Professional experience</option>
        </select>
        <label htmlFor="experience-input">Your experience</label>
        <textarea id="experience-input" rows={8} value={this.state.input} disabled={busy} aria-invalid={!!errors.originalInput}
          onChange={event => this.setState({ input: event.target.value })} placeholder="At Acme, I worked on Project Atlas from March 2022 to June 2023…"/>
        <span className="experience-guidance">{this.state.input.trim().length.toLocaleString()} / 4,000 characters</span>
        <button className="primary-button" disabled={busy}>{busy ? 'Analyze…' : 'Analyze'}</button>
      </form> : <form onSubmit={this.save}>
        <h2 tabIndex={-1} ref={this.heading}>Review your {this.state.type === 'PROJECT' ? 'project' : 'professional experience'}</h2>
        <p>Correct any missing or inaccurate details. Nothing is saved until you select Accept &amp; Save.</p>
        <div className="experience-fields">{this.field('company', 'Company', 160)}{this.field('projectName', 'Project name', 160)}
          {this.field('startDate', 'Start date', 10)}{this.field('endDate', 'End date', 10)}{this.field('description', 'Description', 4000)}</div>
        <p className="experience-guidance" id="date-guidance">Dates: YYYY, YYYY-MM, or YYYY-MM-DD. Leave unknown or ongoing dates blank.</p>
        <details><summary>Original input</summary><p className="experience-original">{this.state.originalInput}</p></details>
        <div className="experience-actions"><button className="primary-button" disabled={busy}>{busy ? 'Save…' : 'Accept & Save'}</button>
          <button className="outline-button" type="button" disabled={busy} onClick={() => this.setState({ preview: null, error: null, errors: {} })}>Cancel</button></div>
      </form>}
    </section>;
  }
}
