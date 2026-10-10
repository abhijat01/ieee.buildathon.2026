import { Component } from 'react';
import { Check, ShieldCheck, Sparkles, Undo, X } from 'lucide-react';
import { ExperienceDrafts, type ExperienceDraft } from '../services/ExperienceDraft';
import { MarkdownView } from './MarkdownView';

interface Props { draft: ExperienceDraft; onDraft: (change: Partial<ExperienceDraft>) => void; onImprove: () => void }

/** Lets the member ask the AI for a better text and compare the proposal with the original. */
export class ImprovePanel extends Component<Props> {
  private static readonly suggestions = ['Make the results measurable', 'Make it shorter', 'Use strong action verbs'];

  private accept = (): void => {
    const { draft, onDraft } = this.props;
    if (draft.proposal) onDraft({ text: draft.proposal.text, improvedInUse: true, proposal: null, improveOpen: false });
  };

  render() {
    const { draft, onDraft, onImprove } = this.props;
    const improving = draft.busy === 'improve';
    const busy = draft.busy !== null;
    return <section className="panel improve-panel" aria-label="Improve with AI" style={{ marginTop: 16 }}>
      <div className="panel-heading"><h2>Improve with AI</h2><span className="hint">Optional. The AI always starts from your original text.</span>
        <button type="button" className="icon-button" aria-label="Close Improve with AI" disabled={busy} onClick={() => onDraft({ improveOpen: false, proposal: null })}><X size={16}/></button></div>
      <form className="improve-row" onSubmit={event => { event.preventDefault(); if (!busy) onImprove(); }}>
        <input autoFocus aria-label="Instruction for the AI" maxLength={ExperienceDrafts.instructionLimit} value={draft.instruction}
          placeholder="Optional instruction, for example: Make the results measurable" onChange={event => onDraft({ instruction: event.target.value })}/>
        <button type="submit" className="primary-button" disabled={busy}><Sparkles size={16}/> Improve</button></form>
      <div className="suggestions">{ImprovePanel.suggestions.map(text =>
        <button type="button" key={text} onClick={() => onDraft({ instruction: text })}>{text}</button>)}</div>
      {improving && <div className="loading" role="status"><span className="spinner"/>The AI improves your text…</div>}
      {draft.proposal && !improving && <>
        <div className="compare">
          <div className="compare-side"><div className="compare-label">ORIGINAL</div><MarkdownView text={draft.original}/></div>
          <div className="compare-side improved"><div className="compare-label"><Sparkles size={12}/> IMPROVED</div><MarkdownView text={draft.proposal.text}/></div></div>
        <p className="ai-note"><ShieldCheck size={14}/><span>{draft.proposal.note}</span></p>
        <div className="actions"><button type="button" className="text-button" onClick={() => onDraft({ proposal: null, improveOpen: false })}>{draft.improvedInUse ? 'Keep current text' : 'Keep original'}</button>
          <button type="button" className="text-button" disabled={busy} onClick={onImprove}><Undo size={14}/> Try again</button><span className="spacer"/>
          <button type="button" className="primary-button" onClick={this.accept}><Check size={16}/> Use improved version</button></div></>}
    </section>;
  }
}
