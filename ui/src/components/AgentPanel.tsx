import { MessageId } from '../services/MessageId';
import { Component, type FormEvent } from 'react';
import { ArrowUp, Bot, ChevronRight, MessageSquare, Plus, Sparkles, Square, X, Wrench } from 'lucide-react';
import { AgUiClient, type AgentEvent } from '../services/AgUiClient';
import { AgentTranscript, type AssistantEntry, type TranscriptEntry } from '../services/AgentTranscript';
import { ApiClient } from '../services/ApiClient';
import { BrowserTools } from '../services/BrowserTools';
import { FrameScheduler } from '../services/FrameScheduler';
import type { Theme } from '../services/ThemeService';
import { AgentActivity } from './AgentActivity';
import { AgentMarkdown } from './AgentMarkdown';

interface Props { api: ApiClient; available: boolean; onTheme: (theme: Theme) => void; onChange: () => void; onClose: () => void; onAuthExpired: () => void }
interface State { draft: string; entries: TranscriptEntry[]; busy: boolean; error: string | null }

export class AgentPanel extends Component<Props, State> {
  state: State = { draft: '', entries: [], busy: false, error: null };
  private client = this.createClient();
  private readonly transcript = new AgentTranscript();
  private readonly frames = new FrameScheduler(() => this.setState({ entries: this.transcript.view() }));
  private abort: AbortController | null = null;
  private end: HTMLDivElement | null = null;

  private createClient(): AgUiClient { return new AgUiClient(this.props.api, new BrowserTools(this.props.onTheme)); }
  componentWillUnmount(): void { this.abort?.abort(); this.frames.cancel(); }
  componentDidUpdate(_props: Props, previous: State): void {
    if (previous.entries !== this.state.entries || previous.error !== this.state.error)
      this.end?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /** Apply each event to the transcript at once, but render at most once per animation frame. */
  private receive = (event: AgentEvent): void => { this.transcript.apply(event); this.frames.request(); };

  private send = async (text: string): Promise<void> => {
    if (!text.trim() || this.state.busy) return;
    this.abort = new AbortController();
    this.transcript.addUser(MessageId.create(), text.trim());
    this.transcript.startTurn(MessageId.create());
    this.setState({ draft: '', busy: true, error: null, entries: this.transcript.view() });
    try { await this.client.send(text.trim(), this.abort.signal, this.receive); this.props.onChange(); }
    catch (error) {
      if (error instanceof Error && error.name === 'AuthenticationRequired') this.props.onAuthExpired();
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        this.setState({ error: error instanceof Error ? error.message : 'The request failed.' });
    } finally {
      this.transcript.finishTurn(); this.frames.cancel();
      this.setState({ busy: false, entries: this.transcript.view() });
    }
  };

  private submit = (event: FormEvent): void => { event.preventDefault(); void this.send(this.state.draft); };
  private reset = (): void => {
    this.abort?.abort(); this.client = this.createClient(); this.frames.cancel(); this.transcript.clear();
    this.setState({ entries: [], draft: '', error: null });
  };

  private assistant(entry: AssistantEntry) {
    if (!entry.visible) return null;
    return <div className="chat-line assistant" key={entry.id}>
      <span className="chat-label">IEEEAgent</span>
      <AgentActivity activities={entry.activities} working={entry.working} answering={Boolean(entry.text.trim())}/>
      {entry.text.trim() && <AgentMarkdown text={entry.text}/>}
    </div>;
  }

  render() {
    const { entries, busy, error } = this.state;
    const last = entries[entries.length - 1];
    const waiting = busy && !(last?.kind === 'assistant' && last.visible);
    return <aside className="agent-panel" aria-label="IEEEAgent assistant">
      <header className="agent-header"><div className="agent-symbol"><Sparkles size={19}/></div>
        <div><h2>IEEEAgent</h2><span><i className={this.props.available ? 'status-dot' : 'status-dot offline'}/>{this.props.available ? 'Your workspace companion' : 'Setup required'}</span></div>
        <button className="icon-button new-chat" title="New conversation" aria-label="New conversation" disabled={busy} onClick={this.reset}><Plus size={19}/></button>
        <button className="icon-button mobile-close" aria-label="Close assistant" onClick={this.props.onClose}><X size={20}/></button>
      </header>
      <div className="agent-conversation" role="log" aria-live="polite">
        {entries.length === 0 && <div className="agent-intro"><div className="intro-orbit"><Bot size={30}/><span className="orbit-spark"><Sparkles size={13}/></span></div>
          <span className="eyebrow">A LITTLE HELP, A LOT OF POSSIBILITY</span><h3>Let’s make room<br/>for your next idea.</h3>
          <p>Explore a question, capture a thought, or find a new perspective. I’m here to help.</p>
          <div className="suggestions"><button onClick={() => void this.send('What can you help me with in this workspace?')}><MessageSquare size={16}/><span>What can we do together?</span><ChevronRight size={15}/></button>
          <button onClick={() => void this.send('Read my saved workspace notes and give me a concise summary.')}><Wrench size={16}/><span>Help me connect my notes</span><ChevronRight size={15}/></button>
          <button onClick={() => void this.send('Change the interface theme to dark.')}><Sparkles size={16}/><span>Switch to a darker workspace</span><ChevronRight size={15}/></button></div>
        </div>}
        {entries.map(entry => entry.kind === 'user'
          ? <div className="chat-line user" key={entry.id}><span className="chat-label">You</span><p>{entry.text}</p></div>
          : this.assistant(entry))}
        {waiting && <div className="thinking"><span/><span/><span/><span>IEEEAgent is at work</span></div>}
        {error && <div className="agent-error" role="alert">{error}</div>}
        <div ref={element => { this.end = element; }}/>
      </div>
      <div className="agent-footer"><form onSubmit={this.submit} className="composer">
        <textarea aria-label="Message IEEEAgent" placeholder="Ask, explore, or create…" value={this.state.draft} maxLength={12000} rows={2}
          onChange={event => this.setState({ draft: event.target.value })}
          onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void this.send(this.state.draft); } }}/>
        <div className="composer-bottom"><span><Sparkles size={12}/> IEEEAgent</span>{busy ? <button type="button" className="send-button" aria-label="Stop response" onClick={() => this.abort?.abort()}><Square size={15}/></button> :
          <button className="send-button" aria-label="Send message" disabled={!this.state.draft.trim()}><ArrowUp size={18}/></button>}</div>
      </form><p>AI can make mistakes. Check important details.</p></div>
    </aside>;
  }
}
