import { Component } from 'react';
import { Check, TriangleAlert, X } from 'lucide-react';
import { type ApiClient, AuthenticationRequired, type PortfolioItem } from '../services/ApiClient';
import type { ExperienceDraft } from '../services/ExperienceDraft';
import { ExperienceEditor } from './ExperienceEditor';
import { ExperienceReview } from './ExperienceReview';
import { PortfolioBreadcrumb } from './PortfolioBreadcrumb';

interface Props {
  api: ApiClient; aiAvailable: boolean; draft: ExperienceDraft;
  onDraft: (change: Partial<ExperienceDraft>, draftId: number) => void; onCancel: () => void;
  onSaved: (item: PortfolioItem, draftId: number) => void;
  onOpenItem: (id: string) => void; onAuthExpired: () => void;
}

/** The add flow: write, review, and save. It makes the server calls for the draft. */
export class AddExperienceFlow extends Component<Props> {
  private static readonly steps = ['Write', 'Review', 'Save'];

  private change = (change: Partial<ExperienceDraft>): void => this.props.onDraft(change, this.props.draft.id);

  private fail(error: unknown, draftId: number): void {
    if (error instanceof AuthenticationRequired) this.props.onAuthExpired();
    else this.props.onDraft({ busy: null, error: error instanceof Error ? error.message : String(error) }, draftId);
  }

  private analyze = async (): Promise<void> => {
    const { api, draft, onDraft } = this.props;
    onDraft({ busy: 'analyze', error: null }, draft.id);
    try {
      const analysis = await api.analyzeExperience(draft.text);
      onDraft({ busy: null, step: 'review', original: draft.text, fields: analysis.fields, duplicates: analysis.duplicates,
        proposal: null, improveOpen: false, improvedInUse: false }, draft.id);
    } catch (error) { this.fail(error, draft.id); }
  };

  private improve = async (): Promise<void> => {
    const { api, draft, onDraft } = this.props;
    onDraft({ busy: 'improve', error: null, proposal: null }, draft.id);
    try { onDraft({ busy: null, proposal: await api.improveExperience(draft.original, draft.instruction.trim()) }, draft.id); }
    catch (error) { this.fail(error, draft.id); }
  };

  private save = async (): Promise<void> => {
    const { api, draft, onDraft, onSaved } = this.props;
    if (!draft.fields) return;
    onDraft({ busy: 'save', error: null }, draft.id);
    try { onSaved(await api.savePortfolioItem({ ...draft.fields, originalText: draft.original, finalText: draft.text }), draft.id); }
    catch (error) { this.fail(error, draft.id); }
  };

  private steps() {
    const current = this.props.draft.step === 'write' ? 0 : 1;
    return <ol className="steps" aria-label="Progress">{AddExperienceFlow.steps.map((name, position) =>
      <li key={name} className={position === current ? 'current' : position < current ? 'done' : ''} aria-current={position === current ? 'step' : undefined}>
        <span className="step-number">{position < current ? <Check size={12}/> : position + 1}</span><span className="step-text">{name}</span></li>)}</ol>;
  }

  render() {
    const { draft, aiAvailable, onCancel, onOpenItem } = this.props;
    const onDraft = this.change;
    return <>
      <PortfolioBreadcrumb current="Add experience" onPortfolio={onCancel}/>
      <div className="page-title"><div><h1>Add experience</h1><p>{draft.step === 'write'
        ? 'Describe a project or a job. Plain text and Markdown are both fine.'
        : 'Check what the AI found. The app saves nothing until you approve.'}</p></div></div>
      {this.steps()}
      {!aiAvailable && <div className="info-note" role="status"><TriangleAlert size={15}/> The AI is not available. Ask your administrator to add the model settings. Analyze is off.</div>}
      {draft.error && <div className="error-banner" role="alert"><span>{draft.error}</span>
        <button type="button" className="icon-button" aria-label="Dismiss error" onClick={() => onDraft({ error: null })}><X size={15}/></button></div>}
      {draft.step === 'write'
        ? <ExperienceEditor draft={draft} aiAvailable={aiAvailable} onDraft={onDraft} onAnalyze={() => void this.analyze()} onCancel={onCancel}/>
        : <ExperienceReview draft={draft} onDraft={onDraft} onOpenItem={onOpenItem} onImprove={() => void this.improve()} onSave={() => void this.save()} onCancel={onCancel}/>}
    </>;
  }
}
