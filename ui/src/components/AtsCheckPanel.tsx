import { Component } from 'react';
import { Check } from 'lucide-react';
import type { AtsCheck } from '../services/ApiClient';

/** Shows the check for Applicant Tracking Systems: the keyword meter, the keyword groups, and the format list. */
export class AtsCheckPanel extends Component<{ check: AtsCheck }> {
  /** An empty keyword group is hidden. */
  private group(label: string, words: string[], style: string, note?: string) {
    if (!words.length) return null;
    return <>
      <div className="rs-label">{label}</div>
      <div className="pf-chips rs-chips">{words.map(word => <span className={`chip ${style}`} key={word}>{word}</span>)}</div>
      {note && <p className="rs-note">{note}</p>}
    </>;
  }

  render() {
    const { keywords, formatChecks } = this.props.check;
    const total = keywords.inResume.length + keywords.inExcludedItems.length + keywords.notInPortfolio.length;
    const percent = total ? Math.round(keywords.inResume.length / total * 100) : 0;
    return <section className="panel" aria-label="ATS check">
      <div className="panel-heading"><h2>ATS check</h2><span className="hint">Applicant Tracking Systems</span></div>
      <div className="meter-row"><strong>{keywords.inResume.length} of {total}</strong><span>job keywords are in the resume</span></div>
      <div className="meter" aria-hidden="true"><span style={{ width: `${percent}%` }}/></div>
      {this.group('IN THE RESUME', keywords.inResume, 'ok')}
      {this.group('IN ITEMS THAT YOU EXCLUDED', keywords.inExcludedItems, '', 'Include the item to add these keywords.')}
      {this.group('NOT IN YOUR PORTFOLIO', keywords.notInPortfolio, 'warn', 'The AI did not add these keywords. Add an experience to your portfolio if you have these skills.')}
      <div className="rs-label">FORMAT</div>
      <ul className="ats-list">{formatChecks.map(line => <li key={line}><Check size={14}/><span>{line}</span></li>)}</ul>
    </section>;
  }
}
