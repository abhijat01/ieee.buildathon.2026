import { EventType } from '@ag-ui/core';
import type { AgentEvent } from './AgUiClient';
import { ToolLabels } from './ToolLabels';

export interface ToolActivity { key: string; name: string; label: string; detail: string; count: number; done: boolean }
export interface UserEntry { kind: 'user'; id: string; text: string }
export interface AssistantEntry { kind: 'assistant'; id: string; text: string; activities: ToolActivity[]; working: boolean; visible: boolean }
export type TranscriptEntry = UserEntry | AssistantEntry;

interface ToolCall { name: string; args: string; done: boolean }

/**
 * Builds the conversation view from AG-UI events.
 *
 * One member request gives one assistant entry, also when browser tools cause more runs.
 * Text deltas join into one answer. Tool calls become one activity group without arguments or results.
 * Calls with the same tool and detail merge into one activity with a count.
 * Snapshots, state, reasoning, raw, and custom events do not change the view.
 */
export class AgentTranscript {
  private readonly entries: TranscriptEntry[] = [];
  private calls = new Map<string, ToolCall>();
  private textMessages = new Set<string>();
  private current: AssistantEntry | null = null;

  addUser(id: string, text: string): void {
    this.entries.push({ kind: 'user', id, text });
  }

  startTurn(id: string): void {
    this.calls = new Map(); this.textMessages = new Set();
    this.current = { kind: 'assistant', id, text: '', activities: [], working: true, visible: false };
    this.entries.push(this.current);
  }

  apply(event: AgentEvent): void {
    const turn = this.current;
    if (!turn) return;
    if (event.type === EventType.TEXT_MESSAGE_CONTENT) this.appendText(turn, String(event.messageId), String(event.delta ?? ''));
    if (event.type === EventType.TOOL_CALL_START && !this.calls.has(String(event.toolCallId))) {
      this.calls.set(String(event.toolCallId), { name: String(event.toolCallName), args: '', done: false });
      turn.visible = true;
    }
    if (event.type === EventType.TOOL_CALL_ARGS) {
      const call = this.calls.get(String(event.toolCallId));
      if (call) call.args += String(event.delta ?? '');
    }
    if (event.type === EventType.TOOL_CALL_RESULT) {
      const call = this.calls.get(String(event.toolCallId));
      if (call) call.done = true;
    }
    turn.activities = this.activities();
  }

  /** End the turn. Calls without a result end too, for example after an error. */
  finishTurn(): void {
    if (!this.current) return;
    for (const call of this.calls.values()) call.done = true;
    this.current.activities = this.activities();
    this.current.working = false;
    this.current = null;
  }

  clear(): void { this.entries.length = 0; this.current = null; }

  /** Return a copy for React state. */
  view(): TranscriptEntry[] {
    return this.entries.map(entry => entry.kind === 'assistant'
      ? { ...entry, activities: entry.activities.map(activity => ({ ...activity })) } : { ...entry });
  }

  private appendText(turn: AssistantEntry, messageId: string, delta: string): void {
    if (!delta) return;
    if (!this.textMessages.has(messageId)) {
      if (turn.text.trim()) turn.text += '\n\n';
      this.textMessages.add(messageId);
    }
    turn.text += delta;
    turn.visible = true;
  }

  private activities(): ToolActivity[] {
    const grouped = new Map<string, ToolActivity>();
    for (const call of this.calls.values()) {
      const detail = ToolLabels.detail(call.name, call.args);
      const key = `${call.name}:${detail}`;
      const label = ToolLabels.of(call.name);
      const existing = grouped.get(key);
      if (existing) {
        existing.count += 1;
        existing.done = existing.done && call.done;
        existing.label = existing.done ? label.done : label.running;
      } else grouped.set(key, { key, name: call.name, detail, count: 1, done: call.done, label: call.done ? label.done : label.running });
    }
    return [...grouped.values()];
  }
}
