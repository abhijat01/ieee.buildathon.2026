import { Component } from 'react';
import { Briefcase, Building2, Calendar, Check, Plus, X } from 'lucide-react';
import { type ApiClient, AuthenticationRequired, type PortfolioItem } from '../services/ApiClient';
import { ExperienceDates } from '../services/ExperienceDates';
import { ExperienceDrafts, type ExperienceDraft } from '../services/ExperienceDraft';
import type { UnsavedChangesGuard } from '../services/UnsavedChangesGuard';
import { AddExperienceFlow } from './AddExperienceFlow';
import { ExperienceTypeBadge } from './ExperienceTypeBadge';
import { PortfolioBreadcrumb } from './PortfolioBreadcrumb';
import { PortfolioItemScreen } from './PortfolioItemScreen';

interface Props { api: ApiClient; aiAvailable: boolean; guard: UnsavedChangesGuard; onAuthExpired: () => void }
interface State {
  view: 'list' | 'add' | 'item'; items: PortfolioItem[]; loading: boolean; error: string | null;
  savedId: string | null; itemId: string | null; draft: ExperienceDraft | null;
}

/** The portfolio: the list of saved experiences, the add flow, and the item screen. It keeps the draft. */
export class PortfolioScreen extends Component<Props, State> {
  state: State = { view: 'list', items: [], loading: true, error: null, savedId: null, itemId: null, draft: null };

  componentDidMount(): void { void this.load(); }

  private load = async (): Promise<void> => {
    try { this.setState({ items: await this.props.api.portfolioItems(), loading: false, error: null }); }
    catch (error) {
      if (error instanceof AuthenticationRequired) this.props.onAuthExpired();
      else this.setState({ loading: false, error: 'The app could not load your portfolio. Reload the page and try again.' });
    }
  };

  private add = (): void => this.setState({ view: 'add', draft: ExperienceDrafts.empty(), savedId: null });
  /** The guard asks the member first when the open item has unsaved changes. */
  private list = (): void => this.props.guard.leave(() => this.setState({ view: 'list', draft: null }));
  /** Applies a change only to the draft that it belongs to. A late AI answer for an old draft has no effect. */
  private updateDraft = (change: Partial<ExperienceDraft>, draftId: number): void =>
    this.setState(state => state.draft?.id === draftId ? { draft: { ...state.draft, ...change } } : null);
  private saved = (item: PortfolioItem, draftId: number): void =>
    this.setState(state => state.draft?.id === draftId
      ? { view: 'list', draft: null, savedId: item.id, items: [item, ...state.items] }
      : { view: state.view, draft: state.draft, savedId: state.savedId, items: [item, ...state.items] });
  private backToDraft = (): void => this.props.guard.leave(() => this.setState({ view: 'add' }));
  /** Shows the saved values of a changed item in the list. */
  private updated = (item: PortfolioItem): void =>
    this.setState(state => ({ items: state.items.map(entry => entry.id === item.id ? item : entry) }));

  private card(item: PortfolioItem) {
    const isNew = item.id === this.state.savedId;
    return <button type="button" key={item.id} className={isNew ? 'pf-card is-new' : 'pf-card'} onClick={() => this.setState({ view: 'item', itemId: item.id })}>
      <div className="pf-card-top"><ExperienceTypeBadge type={item.type}/>{isNew
        ? <span className="pf-new-label">New</span>
        : <span className="pf-saved-label">Saved {ExperienceDates.saved(item.updatedAt)}</span>}</div>
      <h3>{item.title}</h3>
      <div className="pf-meta"><span><Building2 size={13}/>{item.company || 'No company'}</span>
        <span><Calendar size={13}/>{ExperienceDates.period(item.startDate, item.endDate)}</span></div>
      <div className="pf-chips">{item.skills.map(skill => <span className="chip" key={skill}>{skill}</span>)}</div>
    </button>;
  }

  private listView() {
    const { items, loading, error, savedId } = this.state;
    return <>
      <PortfolioBreadcrumb onPortfolio={this.list}/>
      <div className="page-title"><div><h1>Portfolio</h1><p>Select an experience to change it. The assistant helps you on the next screen.</p></div>
        <button type="button" className="primary-button" onClick={this.add}><Plus size={16}/> Add experience</button></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {savedId && <div className="success-banner" role="status"><Check size={16}/><span>The app saved the experience in your portfolio.</span>
        <button type="button" className="icon-button" aria-label="Dismiss message" onClick={() => this.setState({ savedId: null })}><X size={15}/></button></div>}
      <div className="section-title"><h2>Your experiences <span className="count-badge">{items.length}</span></h2></div>
      {loading ? <div className="loading" role="status"><span className="spinner"/>Load your portfolio…</div>
        : items.length ? <div className="pf-grid">{items.map(item => this.card(item))}</div>
        : !error && <div className="notes-empty"><span className="empty-icon"><Briefcase size={23}/></span>
            <div><h3>Your portfolio is empty.</h3><p>Add a project or a job. Use it later for a resume or an essay.</p></div>
            <button type="button" className="outline-button" onClick={this.add}><Plus size={15}/> Your first experience</button></div>}
    </>;
  }

  render() {
    const { api, aiAvailable, guard, onAuthExpired } = this.props;
    const { view, draft, itemId } = this.state;
    return <div className="portfolio">
      {view === 'list' && this.listView()}
      {view === 'add' && draft && <AddExperienceFlow api={api} aiAvailable={aiAvailable} draft={draft} onDraft={this.updateDraft}
        onCancel={this.list} onSaved={this.saved} onOpenItem={id => this.setState({ view: 'item', itemId: id })} onAuthExpired={onAuthExpired}/>}
      {view === 'item' && itemId && <PortfolioItemScreen key={itemId} api={api} itemId={itemId} aiAvailable={aiAvailable} hasDraft={draft !== null}
        guard={guard} onList={draft ? this.backToDraft : this.list} onDraft={this.backToDraft} onSaved={this.updated} onAuthExpired={onAuthExpired}/>}
    </div>;
  }
}
