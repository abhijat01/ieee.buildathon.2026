import { Component } from 'react';
import { ArrowLeft, Building2, Calendar, Sparkles } from 'lucide-react';
import type { ItemReview, JobAnalysis, RelevanceLevel } from '../services/ApiClient';
import { ExperienceDates } from '../services/ExperienceDates';
import { ExperienceTypeBadge } from './ExperienceTypeBadge';

interface Props { analysis: JobAnalysis; included: string[]; onToggle: (itemId: string) => void;
  onBack: () => void; onWrite: () => void }

/** Step 2 of the resume builder: the needs of the job and the portfolio items that the member includes. */
export class ResumeSelectStep extends Component<Props> {
  private static readonly levels: Record<RelevanceLevel, string> = { HIGH: 'High relevance', MEDIUM: 'Medium relevance', LOW: 'Low relevance' };

  private tag(item: ItemReview, included: boolean) {
    if (included !== item.proposed) return <span className="status-tag">Changed by you</span>;
    return <span className="status-tag ai"><Sparkles size={11}/> {included ? 'Proposed by AI' : 'Not proposed by AI'}</span>;
  }

  private row(item: ItemReview) {
    const included = this.props.included.includes(item.itemId);
    return <li key={item.itemId} className={included ? 'rs-item is-included' : 'rs-item is-excluded'}>
      <button type="button" className="switch-button" role="switch" aria-checked={included} aria-label={`Include ${item.title}`}
        onClick={() => this.props.onToggle(item.itemId)}><span className="switch"/></button>
      <div className="rs-item-body">
        <div className="rs-item-top"><ExperienceTypeBadge type={item.type}/>
          <span className={`rel ${item.relevance.toLowerCase()}`}>{ResumeSelectStep.levels[item.relevance]}</span>{this.tag(item, included)}</div>
        <h3>{item.title}</h3>
        <div className="pf-meta"><span><Building2 size={13}/>{item.company || 'No company'}</span>
          <span><Calendar size={13}/>{ExperienceDates.period(item.startDate, item.endDate)}</span></div>
        <p className="rs-reason">{item.reason}</p>
        {item.matchedKeywords.length > 0 && <div className="pf-chips">{item.matchedKeywords.map(word => <span className="chip ok" key={word}>{word}</span>)}</div>}
      </div></li>;
  }

  render() {
    const { analysis, included, onBack, onWrite } = this.props;
    const count = included.length;
    return <>
      <div className="review-layout">
        <section className="panel rs-job" aria-label="What the job needs">
          <div className="panel-heading"><h2>What the job needs</h2><span className="status-tag ai"><Sparkles size={11}/> Found by AI</span></div>
          <h3>{analysis.jobTitle}</h3>{analysis.company && <p className="rs-company">{analysis.company}</p>}
          <div className="rs-label">MAIN REQUIREMENTS</div>
          <ul className="rs-requirements">{analysis.requirements.map(line => <li key={line}>{line}</li>)}</ul>
          <div className="rs-label">KEYWORDS</div>
          <div className="pf-chips rs-chips">{analysis.keywords.map(word => <span className="chip" key={word}>{word}</span>)}</div>
        </section>
        <section className="panel" aria-label="Your portfolio items">
          <div className="panel-heading"><h2>Your portfolio items</h2><span className="count-badge">{analysis.items.length}</span>
            <span className="hint">{count} of {analysis.items.length} included</span></div>
          <ul className="rs-items">{analysis.items.map(item => this.row(item))}</ul>
        </section>
      </div>
      <div className="actions"><button type="button" className="text-button" onClick={onBack}><ArrowLeft size={14}/> Change the job description</button><span className="spacer"/>
        <span className="hint">{count ? 'The resume uses only the included items.' : 'Include one item or more.'}</span>
        <button type="button" className="primary-button" disabled={!count} onClick={onWrite}><Sparkles size={16}/> Write resume</button></div>
    </>;
  }
}
