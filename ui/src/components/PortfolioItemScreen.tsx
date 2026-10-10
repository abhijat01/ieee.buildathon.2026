import { Component } from 'react';
import { ArrowLeft, Check, Pencil, Save, Sparkles, Undo, X } from 'lucide-react';
import { type ApiClient, ApiError, AuthenticationRequired, type PortfolioItem } from '../services/ApiClient';
import { AgUiClient, AssistantRunError, type AgentEvent, type ItemContext } from '../services/AgUiClient';
import { AssistantConversation, type ConversationEntry } from '../services/AssistantConversation';
import { AssistantProposals, type AcceptedProposal, type ProposalKind, type ProposedField } from '../services/AssistantProposals';
import { AssistantTools, type ToolCall, type ToolResult } from '../services/AssistantTools';
import { ExperienceDates } from '../services/ExperienceDates';
import { FrameScheduler } from '../services/FrameScheduler';
import { type ItemFormValues, PortfolioItemForm } from '../services/PortfolioItemForm';
import type { UnsavedChangesGuard } from '../services/UnsavedChangesGuard';
import { AssistantPane } from './AssistantPane';
import { DiscardDialog } from './DiscardDialog';
import { ItemDetailsPanel } from './ItemDetailsPanel';
import { ItemTextPanel, type TextTab } from './ItemTextPanel';
import { PortfolioBreadcrumb } from './PortfolioBreadcrumb';

/** `onList` and `onDraft` leave the screen. The parent asks first when the form has unsaved changes. */
interface Props {
  api: ApiClient; itemId: string; aiAvailable: boolean; hasDraft: boolean; guard: UnsavedChangesGuard;
  onList: () => void; onDraft: () => void; onSaved: (item: PortfolioItem) => void; onAuthExpired: () => void;
}
interface State {
  form: PortfolioItemForm | null; loadError: string | null; saveError: string | null; saving: boolean; savedNotice: boolean;
  tab: TextTab; proposals: AssistantProposals; entries: ConversationEntry[]; busy: boolean; awaitsAnswer: boolean;
  sheetOpen: boolean; confirmDiscard: boolean;
}

const ASSISTANT_FAILED = 'The assistant could not answer. Your changes are safe.';
const CONTEXT_SKILL_LIMIT = 100;

/** The Edit experience screen: the form of one saved item, with the assistant pane next to it. */
export class PortfolioItemScreen extends Component<Props, State> {
  state: State = { form: null, loadError: null, saveError: null, saving: false, savedNotice: false, tab: 'write',
    proposals: AssistantProposals.empty(), entries: [], busy: false, awaitsAnswer: false, sheetOpen: false, confirmDiscard: false };
  private conversation = new AssistantConversation();
  private client = this.createClient();
  private abort: AbortController | null = null;
  private layout: HTMLDivElement | null = null;
  private readonly frames = new FrameScheduler(() => this.setState({ entries: this.conversation.view() }));

  componentDidMount(): void { void this.load(); }
  componentDidUpdate(): void { this.props.guard.setUnsaved(this.state.form?.hasChanges() ?? false); }
  componentWillUnmount(): void { this.abort?.abort(); this.frames.cancel(); this.props.guard.setUnsaved(false); }

  private load = async (): Promise<void> => {
    try { this.setState({ form: new PortfolioItemForm(await this.props.api.portfolioItem(this.props.itemId)) }); }
    catch (error) {
      if (error instanceof AuthenticationRequired) this.props.onAuthExpired();
      else this.setState({ loadError: 'The app could not open this experience. Go back and try again.' });
    }
  };

  // ---------- form ----------

  private change = (change: Partial<ItemFormValues>): void =>
    this.setState(state => state.form ? { form: state.form.with(change) } : null);

  private save = async (): Promise<void> => {
    const form = this.state.form;
    if (!form || this.state.saving) return;
    this.setState({ saving: true, saveError: null, savedNotice: false });
    try {
      const item = await this.props.api.updatePortfolioItem(form.saved.id, form.request());
      this.setState(state => ({ form: (state.form ?? form).afterSave(item, form), savedNotice: true }));
      this.props.onSaved(item);
    } catch (error) {
      if (error instanceof AuthenticationRequired) this.props.onAuthExpired();
      else this.setState({ saveError: error instanceof ApiError ? error.message : 'The app could not save your changes. Try again.' });
    } finally { this.setState({ saving: false }); }
  };

  /** Restores the saved values, removes the open proposals, and starts a new conversation. */
  private discard = (): void => {
    this.abort?.abort(); this.frames.cancel();
    this.conversation = new AssistantConversation();
    this.client = this.createClient();
    this.setState(state => ({ form: state.form && new PortfolioItemForm(state.form.saved), proposals: AssistantProposals.empty(), entries: [],
      busy: false, awaitsAnswer: false, tab: 'write', saveError: null, savedNotice: false, sheetOpen: false, confirmDiscard: false }));
  };

  // ---------- assistant ----------

  private createClient(): AgUiClient { return new AgUiClient(this.props.api, call => this.runTool(call), () => this.itemContext()); }

  /** The open item and the unsaved form values. The agent gets them with each turn. */
  private itemContext(): ItemContext {
    const form = this.state.form;
    if (!form) throw new Error('The item is not loaded.');
    return { itemId: form.saved.id, ...form.values, skills: form.values.skills.slice(0, CONTEXT_SKILL_LIMIT),
      unsavedChanges: form.hasChanges(), decisions: [...this.state.proposals.decisions] };
  }

  /** Shows the proposal of a tool call in the form. The result goes to the agent at once, before the member decides. */
  private runTool(call: ToolCall): ToolResult {
    const form = this.state.form;
    if (!form) return { status: 'error', message: 'The form is not open.' };
    const { change, result } = AssistantTools.read(call, form.values);
    if (change) this.setState(state => ({ proposals: state.proposals.propose(call.id, change), tab: change.kind === 'text' ? 'write' : state.tab }),
      () => { if (this.isWide()) this.reveal(change.kind, 'nearest'); });
    return result;
  }

  private receive = (event: AgentEvent): void => { this.conversation.apply(event); this.frames.request(); };

  private ask = (text: string): void => {
    if (this.state.busy || !this.props.aiAvailable) return;
    this.conversation.ask(text);
    void this.run(signal => this.client.send(text, signal, this.receive));
  };

  private retry = (): void => {
    if (this.state.busy) return;
    this.conversation.retry();
    void this.run(signal => this.client.retry(signal, this.receive));
  };

  /** Runs one request to the agent. A result for a conversation that the member discarded has no effect. */
  private async run(request: (signal: AbortSignal) => Promise<void>): Promise<void> {
    const conversation = this.conversation;
    const abort = this.abort = new AbortController();
    this.setState({ busy: true, awaitsAnswer: false, entries: conversation.view() });
    try { await request(abort.signal); conversation.finish(); }
    catch (error) {
      if (error instanceof AuthenticationRequired) this.props.onAuthExpired();
      conversation.fail(error instanceof AssistantRunError ? error.message : ASSISTANT_FAILED);
    }
    if (abort.signal.aborted || this.conversation !== conversation) return;
    this.frames.cancel();
    this.setState({ busy: false, entries: conversation.view(), awaitsAnswer: conversation.awaitsAnswer() });
  }

  private accept(accepted: AcceptedProposal): void {
    this.setState(state => state.form ? { form: state.form.with(accepted.change), proposals: accepted.proposals } : null);
  }

  private decideText = (accept: boolean): void => {
    if (accept) this.accept(this.state.proposals.acceptText()); else this.setState({ proposals: this.state.proposals.rejectText() });
  };

  private decideSkill = (skill: string, accept: boolean): void => {
    const { form, proposals } = this.state;
    if (accept && form) this.accept(proposals.acceptSkill(skill, form.values.skills)); else this.setState({ proposals: proposals.rejectSkill(skill) });
  };

  private decideField = (field: ProposedField, accept: boolean): void => {
    if (accept) this.accept(this.state.proposals.acceptField(field)); else this.setState({ proposals: this.state.proposals.rejectField(field) });
  };

  private acceptAllSkills = (): void => {
    if (this.state.form) this.accept(this.state.proposals.acceptAllSkills(this.state.form.values.skills));
  };

  private isWide(): boolean { return window.matchMedia('(min-width: 1101px)').matches; }

  /** Moves the page to the proposal in the form. */
  private reveal(kind: ProposalKind, block: ScrollLogicalPosition): HTMLElement | null {
    const target = this.layout?.querySelector<HTMLElement>(`[data-proposal="${kind}"]`) ?? null;
    target?.scrollIntoView({ behavior: 'smooth', block });
    return target;
  }

  private showProposal = (kind: ProposalKind): void => this.setState({ sheetOpen: false }, () => {
    const target = this.reveal(kind, this.isWide() ? 'center' : 'start');
    if (!target) return;
    target.addEventListener('animationend', () => target.classList.remove('flash'), { once: true });
    target.classList.add('flash');
  });

  // ---------- views ----------

  private backToDraft() {
    return <div className="draft-return"><Pencil size={15}/><span>Your new experience is not saved yet.</span>
      <button type="button" className="outline-button" onClick={this.props.onDraft}><ArrowLeft size={14}/> Back to your draft</button></div>;
  }

  private header(form: PortfolioItemForm) {
    const changed = form.hasChanges();
    const count = this.state.proposals.count();
    return <div className="page-title"><div><h1>Edit experience</h1>
      <p className="title-meta">Saved {ExperienceDates.saved(form.saved.updatedAt)}
        {changed && <span className="unsaved-tag">Unsaved changes</span>}
        {count > 0 && <span className="status-tag ai"><Sparkles size={11}/> {count} {count === 1 ? 'proposal' : 'proposals'} to review</span>}</p></div>
      <div className="header-actions">
        <button type="button" className="outline-button" disabled={!changed || this.state.saving} onClick={() => this.setState({ confirmDiscard: true })}><Undo size={14}/> Discard</button>
        <button type="button" className="primary-button" disabled={!changed || this.state.saving} onClick={() => void this.save()}><Save size={16}/> {this.state.saving ? 'Save…' : 'Save changes'}</button></div></div>;
  }

  render() {
    const { hasDraft, onList, aiAvailable } = this.props;
    const { form, loadError, saveError, savedNotice, tab, proposals, entries, busy, awaitsAnswer, sheetOpen, confirmDiscard } = this.state;
    if (!form) return <>
      <PortfolioBreadcrumb current="Experience" onPortfolio={onList}/>
      <div className="page-title"><div><h1>Edit experience</h1></div></div>
      {hasDraft && this.backToDraft()}
      {loadError ? <div className="error-banner" role="alert">{loadError}</div> : <div className="loading" role="status"><span className="spinner"/>Load the experience…</div>}
    </>;
    const contextLine = `Works on: ${form.values.title || 'this experience'}${form.hasChanges() ? ' · sees your unsaved changes' : ''}`;
    return <>
      <PortfolioBreadcrumb current={form.saved.title} onPortfolio={onList}/>
      {this.header(form)}
      {hasDraft && this.backToDraft()}
      {saveError && <div className="error-banner" role="alert">{saveError}
        <button type="button" className="icon-button" aria-label="Dismiss error" onClick={() => this.setState({ saveError: null })}><X size={16}/></button></div>}
      {savedNotice && <div className="success-banner" role="status"><Check size={16}/><span>The app saved your changes.</span>
        <button type="button" className="icon-button" aria-label="Dismiss message" onClick={() => this.setState({ savedNotice: false })}><X size={15}/></button></div>}
      <div className="edit-layout" ref={element => { this.layout = element; }}>
        <div className="edit-main">
          <ItemDetailsPanel values={form.values} proposals={proposals} onChange={this.change} onField={this.decideField}
            onSkill={this.decideSkill} onAllSkills={this.acceptAllSkills}/>
          <ItemTextPanel text={form.values.text} tab={tab} proposal={proposals.text} onText={text => this.change({ text })}
            onTab={next => this.setState({ tab: next })} onProposal={this.decideText}/>
        </div>
        <AssistantPane available={aiAvailable} busy={busy} open={sheetOpen} contextLine={contextLine} awaitsAnswer={awaitsAnswer}
          entries={entries} proposals={proposals} onSend={this.ask} onRetry={this.retry} onShow={this.showProposal}
          onClose={() => this.setState({ sheetOpen: false })}/>
      </div>
      <div className={sheetOpen ? 'sheet-backdrop open' : 'sheet-backdrop'} onClick={() => this.setState({ sheetOpen: false })}/>
      <button type="button" className="assistant-fab" onClick={() => this.setState({ sheetOpen: true })}><Sparkles size={17}/> Assistant
        {busy && <span className="fab-badge" role="status" aria-label="The assistant works">…</span>}</button>
      {confirmDiscard && <DiscardDialog reason="discard" onKeep={() => this.setState({ confirmDiscard: false })} onDiscard={this.discard}/>}
    </>;
  }
}
