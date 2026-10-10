import { Component, type FormEvent } from 'react';
import { ArrowRight, BookOpen, Briefcase, Check, FileText, LayoutGrid, LogOut, Moon, Plus, ScrollText, ShieldCheck, Sparkles, Sun, X } from 'lucide-react';
import { ApiClient, AuthenticationRequired, type Note, type Session } from '../services/ApiClient';
import { ThemeService, type Theme } from '../services/ThemeService';
import { UnsavedChangesGuard } from '../services/UnsavedChangesGuard';
import { DiscardDialog } from './DiscardDialog';
import { PortfolioScreen } from './PortfolioScreen';
import { ResumeScreen } from './ResumeScreen';

type View = 'home' | 'notes' | 'portfolio' | 'resume';
interface State { session: Session | null; loading: boolean; theme: Theme; notes: Note[]; error: string | null;
  view: View; noteOpen: boolean; title: string; body: string; saving: boolean; leaveOpen: boolean }

export class App extends Component<object, State> {
  private api = new ApiClient();
  /** Asks the member before a navigation removes a form with unsaved changes. */
  private guard = new UnsavedChangesGuard(open => this.setState({ leaveOpen: open }));
  private go = (view: View): void => this.guard.leave(() => this.setState({ view }));
  private noteTrigger: HTMLElement | null = null;
  private openNote = (): void => {
    this.noteTrigger = document.activeElement as HTMLElement;
    this.setState({ noteOpen: true });
  };
  private closeNote = (): void => {
    if (!this.state.saving) this.setState({ noteOpen: false }, () => this.noteTrigger?.focus());
  };
  state: State = { session: null, loading: true, theme: ThemeService.current(), notes: [], error: null,
    view: 'home', noteOpen: false, title: '', body: '', saving: false, leaveOpen: false };

  componentDidMount(): void { ThemeService.apply(this.state.theme); void this.load(); }
  private load = async (): Promise<void> => {
    try { this.setState({ session: await this.api.loadSession(), loading: false }); await this.loadNotes(); }
    catch (error) { this.setState({ loading: false, error: error instanceof AuthenticationRequired ? null : String(error) }); }
  };
  private loadNotes = async (): Promise<void> => {
    try { this.setState({ notes: await this.api.notes() }); }
    catch (error) { if (error instanceof AuthenticationRequired) this.setState({ session: null }); else this.setState({ error: String(error) }); }
  };
  private theme = (theme: Theme): void => { ThemeService.apply(theme); this.setState({ theme }); };
  private save = async (event: FormEvent): Promise<void> => {
    event.preventDefault(); this.setState({ saving: true, error: null });
    try { await this.api.saveNote(this.state.title, this.state.body); this.setState({ noteOpen: false, title: '', body: '' }); await this.loadNotes(); }
    catch (error) { if (error instanceof AuthenticationRequired) this.setState({ session: null }); else this.setState({ error: String(error) }); }
    finally { this.setState({ saving: false }); }
  };
  private themeSwitch() { return <div className="theme-switch" role="group" aria-label="Color theme">
    <button aria-label="Light theme" aria-pressed={this.state.theme === 'light'} onClick={() => this.theme('light')}><Sun size={16}/></button>
    <button aria-label="Dark theme" aria-pressed={this.state.theme === 'dark'} onClick={() => this.theme('dark')}><Moon size={16}/></button></div>; }

  render() {
    const { session, loading, notes, error, noteOpen } = this.state;
    if (!session) return <div className="sign-in-page"><header className="login-header"><a className="brand" href="/"><span className="brand-mark">i</span><strong>IEEE<span>workspace</span></strong></a>{this.themeSwitch()}</header>
      <main className="login-main"><div className="login-art" aria-hidden="true"><div className="art-grid"/><div className="art-orbit one"/><div className="art-orbit two"/><div className="art-center"><Sparkles size={42}/></div><span className="art-label label-one">A new perspective.</span><span className="art-label label-two">Your next big idea.</span></div>
        <div className="login-content"><span className="eyebrow">THINK CLEARLY. BUILD THOUGHTFULLY.</span><h1>A little space.<br/>Endless possibility.</h1><p>Your ideas and your notes.<br/>All together in one thoughtful workspace.</p>
          {error && <p className="error-banner" role="alert">{error}</p>}
          {loading ? <span className="loading-status">Connect to your workspace…</span> : <a className="primary-button" href="/oauth2/authorization/authentik">Sign in to your workspace <ArrowRight size={18}/></a>}
          <div className="login-security"><ShieldCheck size={15}/> Secure sign-in with authentik</div></div></main><footer className="login-footer">IEEE WORKSPACE <span>A place for what comes next.</span></footer></div>;
    return <div className="app-shell">
      <header className="topbar"><a className="brand" href="/"><span className="brand-mark">i</span><strong>IEEE<span>workspace</span></strong></a><span className="topbar-divider"/><span className="workspace-caption">Personal workspace</span>
        <div className="account-actions">{this.themeSwitch()}<span className="account-divider"/><div className="account" aria-label={session.name} title={session.name}><span className="avatar">{session.name.split(' ').slice(0,2).map(name => name[0]).join('')}</span><div><strong>{session.name}</strong><span>Personal account</span></div></div>
          <button className="icon-button" aria-label="Log out" title="Log out" onClick={() => this.api.logout()}><LogOut size={18}/></button></div></header>
      <div className="body-layout"><nav className="rail" aria-label="Workspace"><div className="rail-top"><button className={this.state.view === 'home' ? 'rail-button active' : 'rail-button'} aria-label="Workspace home" aria-current={this.state.view === 'home' ? 'page' : undefined} onClick={() => this.go('home')}><LayoutGrid size={21}/></button><button className={this.state.view === 'notes' ? 'rail-button active' : 'rail-button'} aria-label="Go to notes" aria-current={this.state.view === 'notes' ? 'page' : undefined} onClick={() => this.go('notes')}><FileText size={21}/></button><button className={this.state.view === 'portfolio' ? 'rail-button active' : 'rail-button'} aria-label="Portfolio" title="Portfolio" aria-current={this.state.view === 'portfolio' ? 'page' : undefined} onClick={() => this.go('portfolio')}><Briefcase size={21}/></button><button className={this.state.view === 'resume' ? 'rail-button active' : 'rail-button'} aria-label="Resume" title="Resume" aria-current={this.state.view === 'resume' ? 'page' : undefined} onClick={() => this.go('resume')}><ScrollText size={21}/></button></div><span className="rail-bottom"><ShieldCheck size={19}/></span></nav>
      <main className="workspace-main workspace-empty">{this.state.view !== 'portfolio' && this.state.view !== 'resume' && <><div className="breadcrumb"><LayoutGrid size={13}/> Workspace <span>/</span><strong>{this.state.view === 'home' ? 'Overview' : 'Notes'}</strong></div>
        <div className="page-title"><h1>{this.state.view === 'home' ? 'Workspace' : 'Notes'}</h1><span className="date-label">{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', weekday: 'short' }).format(new Date())}</span></div></>}
        {error && <div className="error-banner" role="alert">{error}<button aria-label="Dismiss error" className="icon-button" onClick={() => this.setState({ error: null })}><X size={16}/></button></div>}
        {this.state.view === 'home' && <div className="workspace-canvas" aria-label="Application content"/>}
        {this.state.view === 'notes' && <section id="notes" className="notes-section"><div className="section-title"><h2>Your notes <span className="count-badge">{notes.length}</span></h2><button className="text-button" onClick={this.openNote}><Plus size={15}/> New note</button></div>
        {notes.length ? <div className="notes-grid">{notes.map(note => <article className="note-card" key={note.id}><FileText size={17}/><h3>{note.title}</h3><p>{note.body}</p><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</time></article>)}</div> : <div className="notes-empty"><span className="empty-icon"><BookOpen size={23}/></span><div><h3>A blank page is a good beginning.</h3><p>Save a thought here and return to it later.</p></div><button className="outline-button" onClick={this.openNote}><Plus size={15}/> Your first note</button></div>}</section>}
        {this.state.view === 'portfolio' && <PortfolioScreen api={this.api} aiAvailable={session.aiAvailable} guard={this.guard} onAuthExpired={() => this.setState({ session: null })}/>}
        {this.state.view === 'resume' && <ResumeScreen api={this.api} aiAvailable={session.aiAvailable} onAuthExpired={() => this.setState({ session: null })} onOpenPortfolio={() => this.go('portfolio')}/>}
        <footer className="workspace-footer"><span><ShieldCheck size={13}/> Personal workspace</span><span>IEEE Workspace</span></footer>
      </main></div>
      {this.state.leaveOpen && <DiscardDialog reason="leave" onKeep={() => this.guard.cancel()} onDiscard={() => this.guard.confirm()}/>}
      {noteOpen && <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) this.closeNote(); }}><section className="note-dialog" role="dialog" aria-modal="true" aria-labelledby="note-title" onKeyDown={event => {
        if (event.key === 'Escape') this.closeNote();
        if (event.key === 'Tab') {
          const fields = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea'));
          const first = fields[0], last = fields[fields.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}><div className="dialog-heading"><span className="card-icon peach"><FileText size={20}/></span><button className="icon-button" aria-label="Close note" disabled={this.state.saving} onClick={this.closeNote}><X size={20}/></button></div><h2 id="note-title">Capture a thought</h2><p>Big ideas often start with a small note.</p><form onSubmit={event => void this.save(event)}><label htmlFor="title">Title</label><input id="title" autoFocus required maxLength={160} placeholder="Give your idea a name" value={this.state.title} onChange={event => this.setState({ title: event.target.value })}/><label htmlFor="body">Your note</label><textarea id="body" required maxLength={4000} rows={6} placeholder="What’s on your mind?" value={this.state.body} onChange={event => this.setState({ body: event.target.value })}/>{error && <p role="alert" className="error-banner">{error}</p>}<button className="primary-button" disabled={this.state.saving}>{this.state.saving ? 'Save note…' : 'Save note'}<Check size={16}/></button></form></section></div>}
    </div>;
  }
}
