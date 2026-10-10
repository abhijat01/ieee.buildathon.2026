import { Component } from 'react';
import { Eye, Pencil, Sparkles } from 'lucide-react';
import { ExperienceDrafts, type ExperienceDraft } from '../services/ExperienceDraft';
import { MarkdownView } from './MarkdownView';

interface Props {
  draft: ExperienceDraft; aiAvailable: boolean;
  onDraft: (change: Partial<ExperienceDraft>) => void; onAnalyze: () => void; onCancel: () => void;
}

/** The write step: the member writes plain text or Markdown and can preview it. */
export class ExperienceEditor extends Component<Props> {
  render() {
    const { draft, aiAvailable, onDraft, onAnalyze, onCancel } = this.props;
    if (draft.busy === 'analyze') return <section className="panel"><div className="loading" role="status"><span className="spinner"/>The AI reads your text and searches your portfolio for similar experiences…</div></section>;
    return <section className="panel">
      <div className="panel-heading"><h2>Your experience</h2>
        <div className="tabs" role="tablist" aria-label="Editor mode">
          <button type="button" role="tab" aria-selected={draft.tab === 'write'} onClick={() => onDraft({ tab: 'write' })}><Pencil size={13}/> Write</button>
          <button type="button" role="tab" aria-selected={draft.tab === 'preview'} onClick={() => onDraft({ tab: 'preview' })}><Eye size={13}/> Preview</button>
        </div>
        <span className="hint">Markdown is supported: <code>## heading</code>, <code>**bold**</code>, <code>- list</code></span></div>
      {draft.tab === 'write'
        ? <textarea className="editor" aria-label="Your experience" maxLength={ExperienceDrafts.textLimit} value={draft.text}
            placeholder="Example: At Acme Corp I led the build of Atlas, an analytics dashboard, from March 2022 to June 2023…"
            onChange={event => onDraft({ text: event.target.value })}/>
        : <div className="preview-box" aria-label="Markdown preview">{draft.text.trim()
            ? <MarkdownView text={draft.text}/> : <p className="preview-empty">Nothing to preview. Write some text first.</p>}</div>}
      <div className="editor-footer"><span/><span className="hint">{draft.text.length} / {ExperienceDrafts.textLimit}</span></div>
      <div className="actions"><button type="button" className="text-button" onClick={onCancel}>Cancel</button><span className="spacer"/>
        <button type="button" className="primary-button" disabled={!aiAvailable || !draft.text.trim()} onClick={onAnalyze}><Sparkles size={16}/> Analyze</button></div>
    </section>;
  }
}
