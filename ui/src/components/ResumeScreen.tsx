import { Component } from 'react';
import { Briefcase, Check, LayoutGrid, TriangleAlert, X } from 'lucide-react';
import { ApiError, type ApiClient, AuthenticationRequired, type JobAnalysis, type Resume } from '../services/ApiClient';
import { ResumeJobStep } from './ResumeJobStep';
import { ResumeResultStep } from './ResumeResultStep';
import { ResumeSelectStep } from './ResumeSelectStep';

type Step = 'job' | 'select' | 'resume';
interface Props { api: ApiClient; aiAvailable: boolean; onAuthExpired: () => void; onOpenPortfolio: () => void }
interface State {
  portfolio: 'loading' | 'empty' | 'ready' | 'failed'; itemCount: number; step: Step; jobText: string;
  analysis: JobAnalysis | null; included: string[]; resume: Resume | null; busy: 'analyze' | 'write' | null; error: string | null;
}

/** The resume builder. It holds the job text, the analysis, the selection, and the resume. It stores nothing. */
export class ResumeScreen extends Component<Props, State> {
  private static readonly steps: { step: Step; name: string; intro: string }[] = [
    { step: 'job', name: 'Job description', intro: 'Paste a job description. The AI builds a resume from your portfolio.' },
    { step: 'select', name: 'Select items', intro: 'Check the review of the AI. Select the portfolio items for the resume.' },
    { step: 'resume', name: 'Resume', intro: 'Your resume is ready. The app does not store it. Copy or download it.' }];
  private static readonly newResume = { step: 'job' as Step, jobText: '', analysis: null, included: [], resume: null, busy: null, error: null };
  state: State = { portfolio: 'loading', itemCount: 0, ...ResumeScreen.newResume };

  componentDidMount(): void { void this.load(); }

  private load = async (): Promise<void> => {
    try {
      const items = await this.props.api.portfolioItems();
      this.setState({ portfolio: items.length ? 'ready' : 'empty', itemCount: items.length });
    } catch (error) {
      if (error instanceof AuthenticationRequired) this.props.onAuthExpired();
      else this.setState({ portfolio: 'failed' });
    }
  };

  /** Shows the message of the server. The job text and the selection stay as they are. */
  private fail(error: unknown): void {
    if (error instanceof AuthenticationRequired) { this.props.onAuthExpired(); return; }
    this.setState({ busy: null, error: error instanceof ApiError ? error.message : 'The app could not reach the server. Try again.' });
  }

  private analyze = async (): Promise<void> => {
    this.setState({ busy: 'analyze', error: null });
    try {
      const analysis = await this.props.api.analyzeJob(this.state.jobText);
      const included = analysis.items.filter(item => item.proposed).map(item => item.itemId);
      this.setState({ busy: null, analysis, included, step: 'select' });
    } catch (error) { this.fail(error); }
  };

  private write = async (): Promise<void> => {
    const { analysis, included, jobText } = this.state;
    if (!analysis) return;
    this.setState({ busy: 'write', error: null });
    try {
      const resume = await this.props.api.writeResume(jobText, analysis.keywords, included);
      this.setState({ busy: null, resume, step: 'resume' });
    } catch (error) { this.fail(error); }
  };

  /** Keeps the order of the analysis, so that the server receives the best items first. */
  private toggle = (itemId: string): void => this.setState(state => {
    const included = state.included.includes(itemId) ? state.included.filter(id => id !== itemId) : [...state.included, itemId];
    return { included: (state.analysis?.items ?? []).map(item => item.itemId).filter(id => included.includes(id)) };
  });

  private progress() {
    const current = ResumeScreen.steps.findIndex(entry => entry.step === this.state.step);
    return <ol className="steps" aria-label="Progress">{ResumeScreen.steps.map((entry, position) =>
      <li key={entry.step} className={position === current ? 'current' : position < current ? 'done' : ''} aria-current={position === current ? 'step' : undefined}>
        <span className="step-number">{position < current ? <Check size={12}/> : position + 1}</span><span className="step-text">{entry.name}</span></li>)}</ol>;
  }

  private loading(text: string) {
    return <section className="panel"><div className="loading" role="status"><span className="spinner"/>{text}</div></section>;
  }

  private stepView() {
    const { step, busy, jobText, analysis, included, resume, itemCount } = this.state;
    if (busy === 'analyze') return this.loading(`The AI reads the job description and reviews your ${itemCount} portfolio items…`);
    if (busy === 'write') return this.loading('The AI improves the descriptions and writes your resume…');
    if (step === 'select' && analysis) return <ResumeSelectStep analysis={analysis} included={included} onToggle={this.toggle}
      onBack={() => this.setState({ step: 'job', error: null })} onWrite={() => void this.write()}/>;
    if (step === 'resume' && resume) return <ResumeResultStep resume={resume} onBack={() => this.setState({ step: 'select', error: null })}
      onRestart={() => this.setState(ResumeScreen.newResume)}/>;
    return <ResumeJobStep text={jobText} aiAvailable={this.props.aiAvailable} onText={text => this.setState({ jobText: text })} onAnalyze={() => void this.analyze()}/>;
  }

  private body() {
    const { portfolio, error } = this.state;
    if (portfolio === 'loading') return <div className="loading" role="status"><span className="spinner"/>Load your portfolio…</div>;
    if (portfolio === 'failed') return <div className="error-banner" role="alert">The app could not load your portfolio. Reload the page and try again.</div>;
    if (portfolio === 'empty') return <div className="notes-empty"><span className="empty-icon"><Briefcase size={23}/></span>
      <div><h3>Your portfolio is empty.</h3><p>The AI builds a resume from your portfolio items. Add an experience first.</p></div>
      <button type="button" className="outline-button" onClick={this.props.onOpenPortfolio}><Briefcase size={15}/> Open Portfolio</button></div>;
    return <>
      {this.progress()}
      {!this.props.aiAvailable && <div className="info-note" role="status"><TriangleAlert size={15}/> The AI is not available. Ask your administrator to add the model settings. Analyze is off.</div>}
      {error && <div className="error-banner" role="alert"><span>{error}</span>
        <button type="button" className="icon-button" aria-label="Dismiss error" onClick={() => this.setState({ error: null })}><X size={15}/></button></div>}
      {this.stepView()}
    </>;
  }

  render() {
    const intro = ResumeScreen.steps.find(entry => entry.step === this.state.step)?.intro;
    // The class `portfolio` gives this screen the page rules that the portfolio screens use.
    return <div className="portfolio resume">
      <div className="breadcrumb"><LayoutGrid size={13}/> Workspace <span>/</span><strong>Resume</strong></div>
      <div className="page-title"><div><h1>Resume</h1><p>{intro}</p></div></div>
      {this.body()}
    </div>;
  }
}
