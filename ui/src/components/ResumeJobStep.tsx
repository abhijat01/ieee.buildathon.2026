import { Component } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

interface Props { text: string; aiAvailable: boolean; onText: (text: string) => void; onAnalyze: () => void }

/** Step 1 of the resume builder: the member pastes the job description. */
export class ResumeJobStep extends Component<Props> {
  static readonly maxLength = 8000;

  render() {
    const { text, aiAvailable, onText, onAnalyze } = this.props;
    return <section className="panel">
      <div className="panel-heading"><h2>Job description</h2><span className="hint">Paste the full text of the job post.</span></div>
      <textarea className="editor" maxLength={ResumeJobStep.maxLength} aria-label="Job description"
        placeholder="Paste the job description here…" value={text} onChange={event => onText(event.target.value)}/>
      <div className="editor-footer"><span/><span className="hint">{text.length} / {ResumeJobStep.maxLength}</span></div>
      <p className="ai-note"><ShieldCheck size={14}/><span>The AI uses only the facts in your portfolio. It does not change your portfolio items.</span></p>
      <div className="actions"><span className="spacer"/>
        <button type="button" className="primary-button" disabled={!aiAvailable || !text.trim()} onClick={onAnalyze}><Sparkles size={16}/> Analyze</button></div>
    </section>;
  }
}
