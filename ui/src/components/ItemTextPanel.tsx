import { Component } from 'react';
import { Check, Eye, Pencil, Sparkles } from 'lucide-react';
import type { TextProposal } from '../services/AssistantProposals';
import { ExperienceDrafts } from '../services/ExperienceDraft';
import { MarkdownView } from './MarkdownView';

export type TextTab = 'write' | 'preview';
interface Props {
  text: string; tab: TextTab; proposal: TextProposal | null;
  onText: (text: string) => void; onTab: (tab: TextTab) => void; onProposal: (accept: boolean) => void;
}

/** The experience text with the Write and Preview tabs, and the text proposal of the assistant. */
export class ItemTextPanel extends Component<Props> {
  private proposal(proposal: TextProposal) {
    const { text, onProposal } = this.props;
    return <div className="proposal-block" data-proposal="text">
      <div className="proposal-head"><Sparkles size={14}/> Proposal from the assistant · {proposal.label}</div>
      <p className="proposal-why">{proposal.reason}</p>
      <div className="compare">
        <div className="compare-side"><div className="compare-label">CURRENT</div><MarkdownView text={text}/></div>
        <div className="compare-side improved"><div className="compare-label"><Sparkles size={12}/> PROPOSED</div><MarkdownView text={proposal.text}/></div></div>
      <div className="proposal-actions">
        <button type="button" className="small-button" onClick={() => onProposal(false)}>Reject</button>
        <button type="button" className="small-button accept" onClick={() => onProposal(true)}><Check size={13}/> Accept</button></div></div>;
  }

  render() {
    const { text, tab, proposal, onText, onTab } = this.props;
    return <section className="panel" aria-label="Experience text">
      <div className="panel-heading"><h2>Experience text</h2>
        <div className="tabs" role="tablist" aria-label="Editor mode">
          <button type="button" role="tab" aria-selected={tab === 'write'} onClick={() => onTab('write')}><Pencil size={13}/> Write</button>
          <button type="button" role="tab" aria-selected={tab === 'preview'} onClick={() => onTab('preview')}><Eye size={13}/> Preview</button></div>
        <span className="hint">Markdown is supported.</span></div>
      {proposal && this.proposal(proposal)}
      {tab === 'write'
        ? <textarea className="editor" aria-label="Experience text" maxLength={ExperienceDrafts.textLimit} value={text} onChange={event => onText(event.target.value)}/>
        : <div className="preview-box" aria-label="Markdown preview">{text.trim() ? <MarkdownView text={text}/> : <p className="preview-empty">The preview is empty.</p>}</div>}
    </section>;
  }
}
