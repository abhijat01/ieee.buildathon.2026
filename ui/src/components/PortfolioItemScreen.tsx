import { Component } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { type ApiClient, AuthenticationRequired, type PortfolioItem } from '../services/ApiClient';
import { ExperienceDates } from '../services/ExperienceDates';
import { ExperienceTypeBadge } from './ExperienceTypeBadge';
import { MarkdownView } from './MarkdownView';
import { PortfolioBreadcrumb } from './PortfolioBreadcrumb';

/** `onList` leaves the item screen. With a draft, the parent returns to the draft and does not discard it. */
interface Props { api: ApiClient; itemId: string; hasDraft: boolean; onList: () => void; onDraft: () => void; onAuthExpired: () => void }
interface State { item: PortfolioItem | null; error: string | null }

/** Shows one saved portfolio item. */
export class PortfolioItemScreen extends Component<Props, State> {
  state: State = { item: null, error: null };

  componentDidMount(): void { void this.load(); }

  private load = async (): Promise<void> => {
    try { this.setState({ item: await this.props.api.portfolioItem(this.props.itemId) }); }
    catch (error) {
      if (error instanceof AuthenticationRequired) this.props.onAuthExpired();
      else this.setState({ error: 'The app could not open this experience. Go back and try again.' });
    }
  };

  private backToDraft() {
    return <div className="draft-return"><Pencil size={15}/><span>Your new experience is not saved yet.</span>
      <button type="button" className="outline-button" onClick={this.props.onDraft}><ArrowLeft size={14}/> Back to your draft</button></div>;
  }

  render() {
    const { hasDraft, onList } = this.props;
    const { item, error } = this.state;
    const all = !hasDraft && <button type="button" className="outline-button" onClick={onList}><ArrowLeft size={14}/> All experiences</button>;
    if (!item) return <>
      <PortfolioBreadcrumb current="Experience" onPortfolio={onList}/>
      <div className="page-title"><div><h1>Experience</h1></div>{all}</div>
      {hasDraft && this.backToDraft()}
      {error ? <div className="error-banner" role="alert">{error}</div> : <div className="loading" role="status"><span className="spinner"/>Load the experience…</div>}
    </>;
    return <>
      <PortfolioBreadcrumb current={item.title} onPortfolio={onList}/>
      <div className="page-title"><div><h1>{item.title}</h1><p>Saved {new Date(item.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div>{all}</div>
      {hasDraft && this.backToDraft()}
      <section className="panel"><dl className="detail-fields">
        <div><dt>TYPE</dt><dd><ExperienceTypeBadge type={item.type}/></dd></div>
        <div><dt>COMPANY</dt><dd>{item.company || '—'}</dd></div>
        <div><dt>START DATE</dt><dd>{ExperienceDates.month(item.startDate) || '—'}</dd></div>
        <div><dt>END DATE</dt><dd>{ExperienceDates.month(item.endDate) || 'Present'}</dd></div></dl>
        <div className="pf-chips">{item.skills.map(skill => <span className="chip" key={skill}>{skill}</span>)}</div></section>
      <section className="panel"><div className="panel-heading"><h2>Experience text</h2></div><MarkdownView text={item.text}/></section>
    </>;
  }
}
