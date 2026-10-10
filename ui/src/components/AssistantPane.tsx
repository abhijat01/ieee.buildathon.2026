import { Component, type ComponentType } from 'react';
import { ArrowRight, Check, CircleHelp, List, RefreshCw, Send, Sparkles, Tags, X } from 'lucide-react';
import type { AssistantEntry, ConversationEntry } from '../services/AssistantConversation';
import type { AssistantProposals, ProposalKind } from '../services/AssistantProposals';
import { MarkdownView } from './MarkdownView';

interface Props {
  available: boolean; busy: boolean; open: boolean; contextLine: string; awaitsAnswer: boolean;
  entries: ConversationEntry[]; proposals: AssistantProposals;
  onSend: (text: string) => void; onRetry: () => void; onShow: (kind: ProposalKind) => void; onClose: () => void;
}
interface QuickAction { label: string; prompt: string; icon: ComponentType<{ size?: number }> }

const NOT_AVAILABLE = 'The assistant is not available at this time. You can still change and save the experience.';
const MESSAGE_LIMIT = 2000;

/** The assistant pane next to the item: the conversation, the quick actions, and the message field. */
export class AssistantPane extends Component<Props, { draft: string }> {
  static readonly actions: QuickAction[] = [
    { label: 'Improve the text', prompt: 'Improve the text.', icon: Sparkles },
    { label: 'Suggest skills', prompt: 'Suggest skills for this experience.', icon: Tags },
    { label: 'Update the fields', prompt: 'Update the fields from the text.', icon: RefreshCw },
    { label: 'Ask me for missing facts', prompt: 'Ask me for missing facts.', icon: CircleHelp },
    { label: 'Write resume bullets', prompt: 'Write resume bullets.', icon: List },
  ];

  state = { draft: '' };
  private conversation: HTMLDivElement | null = null;
  private composer: HTMLTextAreaElement | null = null;

  componentDidUpdate(previous: Props, before: { draft: string }): void {
    const opened = this.props.open && !previous.open;
    if ((opened || previous.entries !== this.props.entries) && this.conversation) this.conversation.scrollTop = this.conversation.scrollHeight;
    if (opened) this.composer?.focus();
    if (before.draft !== this.state.draft && this.composer) {
      this.composer.style.height = 'auto';
      this.composer.style.height = `${this.composer.scrollHeight}px`;
    }
  }

  private send = (): void => {
    const text = this.state.draft.trim();
    if (!text || this.props.busy || !this.props.available) return;
    this.setState({ draft: '' });
    this.props.onSend(text);
  };

  private activity(id: string) {
    const activity = this.props.proposals.activity(id);
    if (!activity) return null;
    if (activity.done) return <div className="msg-activity done" key={id}><Check size={13}/><span>{activity.label}</span></div>;
    return <div className="msg-activity" key={id}><Sparkles size={13}/><span>{activity.label}</span>
      <button type="button" onClick={() => this.props.onShow(activity.kind)}>Show in the form</button></div>;
  }

  private answer(entry: AssistantEntry, last: boolean) {
    const text = entry.text.trim();
    if (!text && !entry.error && !entry.activityIds.some(id => this.props.proposals.activity(id))) return null;
    return <div className={entry.working ? 'msg ai streaming' : 'msg ai'} key={entry.id}><span className="msg-label">Assistant</span>
      {text && <MarkdownView text={text}/>}
      {entry.activityIds.map(id => this.activity(id))}
      {entry.error && <div className="msg-error" role="alert"><span>{entry.error}</span>
        {last && <button type="button" disabled={this.props.busy} onClick={this.props.onRetry}>Try again</button>}</div>}
    </div>;
  }

  private intro() {
    const { available, onSend } = this.props;
    return <div className="assistant-intro"><h3>How can I help with this experience?</h3>
      <p>I read the fields and the text on this page. I show each change as a proposal. You decide.</p>
      {available
        ? <div className="intro-actions">{AssistantPane.actions.map(action => <button type="button" key={action.label} onClick={() => onSend(action.prompt)}>
            <action.icon size={15}/>{action.label}<ArrowRight size={14}/></button>)}</div>
        : <div className="assistant-off" role="status">{NOT_AVAILABLE}</div>}</div>;
  }

  private placeholder(): string {
    if (!this.props.available) return 'The assistant is not available';
    return this.props.awaitsAnswer ? 'Type your answer…' : 'Ask the assistant to change something…';
  }

  render() {
    const { available, busy, open, contextLine, entries, onSend, onClose } = this.props;
    const last = entries[entries.length - 1];
    const waiting = busy && last?.kind === 'assistant' && !last.text.trim();
    return <aside className={open ? 'assistant open' : 'assistant'} aria-label="Portfolio assistant">
      <div className="assistant-header"><span className="assistant-symbol"><Sparkles size={18}/></span>
        <div><h2>Portfolio assistant</h2><p>{contextLine}</p></div>
        <button type="button" className="icon-button assistant-close" aria-label="Close the assistant" onClick={onClose}><X size={17}/></button></div>
      <div className="conversation" aria-live="polite" ref={element => { this.conversation = element; }}>
        {entries.length === 0 ? this.intro() : <>
          {entries.map((entry, index) => entry.kind === 'member'
            ? <div className="msg user" key={entry.id}><span className="msg-label">You</span><p>{entry.text}</p></div>
            : this.answer(entry, index === entries.length - 1))}
          {waiting && <div className="thinking" role="status"><span/><span/><span/><span>The assistant reads your experience…</span></div>}
          {!available && <div className="assistant-off" role="status">{NOT_AVAILABLE}</div>}</>}
      </div>
      <div className="assistant-footer">
        {entries.length > 0 && available && <div className="quick-actions" role="group" aria-label="Quick actions">{AssistantPane.actions.map(action =>
          <button type="button" key={action.label} disabled={busy} onClick={() => onSend(action.prompt)}><action.icon size={12}/>{action.label}</button>)}</div>}
        <div className="composer">
          <textarea rows={1} aria-label="Message to the assistant" placeholder={this.placeholder()} disabled={!available} maxLength={MESSAGE_LIMIT}
            value={this.state.draft} ref={element => { this.composer = element; }} onChange={event => this.setState({ draft: event.target.value })}
            onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.send(); } }}/>
          <button type="button" className="send-button" aria-label="Send message" disabled={!this.state.draft.trim() || busy || !available} onClick={this.send}><Send size={15}/></button></div>
        <p className="assistant-note">The assistant cannot save. Only you save the changes.</p></div>
    </aside>;
  }
}
