import { EventType } from '@ag-ui/core';
import type { AgentEvent } from './AgUiClient';

export interface MemberEntry { kind: 'member'; id: string; text: string }
/** One answer of the assistant. `activityIds` are the tool calls of the answer, in order. */
export interface AssistantEntry { kind: 'assistant'; id: string; text: string; activityIds: string[]; working: boolean; error: string | null }
export type ConversationEntry = MemberEntry | AssistantEntry;

/**
 * Builds the conversation from the AG-UI events of the agent.
 *
 * One member request gives one assistant entry, also when tool calls cause more runs.
 * The answer and the tool calls come only from the events. The entry never shows tool arguments or results.
 */
export class AssistantConversation {
  private entries: ConversationEntry[] = [];
  private current: AssistantEntry | null = null;
  private textMessages = new Set<string>();
  private nextId = 1;
  /** The text length and the number of tool calls at the start of the run. A failed run goes back to them. */
  private runStart = { text: 0, activities: 0 };

  /** Adds the member message and an empty answer that waits for the agent. */
  ask(text: string): void {
    this.entries.push({ kind: 'member', id: `entry-${this.nextId++}`, text });
    this.current = { kind: 'assistant', id: `entry-${this.nextId++}`, text: '', activityIds: [], working: true, error: null };
    this.entries.push(this.current);
  }

  apply(event: AgentEvent): void {
    const answer = this.current;
    if (!answer) return;
    if (event.type === EventType.RUN_STARTED) this.runStart = { text: answer.text.length, activities: answer.activityIds.length };
    if (event.type === EventType.TEXT_MESSAGE_CONTENT) this.appendText(answer, String(event.messageId), String(event.delta ?? ''));
    if (event.type === EventType.TOOL_CALL_START && !answer.activityIds.includes(String(event.toolCallId)))
      answer.activityIds.push(String(event.toolCallId));
  }

  finish(): void {
    if (this.current) this.current.working = false;
    this.current = null;
  }

  /** Ends the answer with an error. It removes the output of the failed run, because the agent sends it again. */
  fail(message: string): void {
    const answer = this.current;
    if (!answer) return;
    answer.text = answer.text.slice(0, this.runStart.text).trimEnd();
    answer.activityIds.length = this.runStart.activities;
    answer.error = message;
    this.finish();
  }

  /** Opens the failed answer again for a new run. The member message stays as it is. */
  retry(): void {
    const last = this.entries[this.entries.length - 1];
    if (last?.kind !== 'assistant' || !last.error) return;
    last.error = null; last.working = true;
    this.current = last;
    this.runStart = { text: last.text.length, activities: last.activityIds.length };
  }

  /** The assistant asked a question and made no proposal. The member answers in the message field. */
  awaitsAnswer(): boolean {
    const last = this.entries[this.entries.length - 1];
    return last?.kind === 'assistant' && !last.working && !last.error && !last.activityIds.length && last.text.includes('?');
  }

  /** Returns a copy for React state. */
  view(): ConversationEntry[] {
    return this.entries.map(entry => entry.kind === 'assistant' ? { ...entry, activityIds: [...entry.activityIds] } : { ...entry });
  }

  private appendText(answer: AssistantEntry, messageId: string, delta: string): void {
    if (!delta) return;
    if (!this.textMessages.has(messageId)) {
      if (answer.text.trim()) answer.text += '\n\n';
      this.textMessages.add(messageId);
    }
    answer.text += delta;
  }
}
