import { EventSchemas, EventType, type BaseEvent } from '@ag-ui/core';
import type { ApiClient, ExperienceType } from './ApiClient';
import type { MemberDecision } from './AssistantProposals';
import { AssistantTools, type ToolCall, type ToolResult } from './AssistantTools';
import { MessageId } from './MessageId';

export interface AgentMessage { id: string; role: 'user' | 'tool'; content: string; toolCallId?: string }
export type AgentEvent = BaseEvent & Record<string, unknown>;
/** The open item and the unsaved form values. The agent gets it as the AG-UI state with each turn. */
export interface ItemContext {
  itemId: string; type: ExperienceType; title: string; company: string; startDate: string; endDate: string;
  skills: string[]; text: string; unsavedChanges: boolean; decisions: MemberDecision[];
}
export type EventConsumer = (event: AgentEvent) => void;

/** The server ended the run with RUN_ERROR. The message is written for the member. */
export class AssistantRunError extends Error {
  /** The server uses this code when the new turn does not agree with its stored thread. */
  static readonly threadCode = 'ASSISTANT_THREAD_ERROR';

  constructor(message: string, readonly code: string = '') { super(message); this.name = 'AssistantRunError'; }
}

const KNOWN_TYPES = new Set<string>(Object.values(EventType));
const ROUND_LIMIT = 6;

export class SseDecoder {
  private buffer = '';

  /** Decodes complete frames. Skips comments (keepalive) and event types that this client does not know. */
  append(chunk: string, consume: EventConsumer): void {
    this.buffer = (this.buffer + chunk).replace(/\r\n/g, '\n');
    let boundary: number;
    while ((boundary = this.buffer.indexOf('\n\n')) >= 0) {
      const frame = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + 2);
      const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (!data) continue;
      const raw = JSON.parse(data) as { type?: unknown };
      if (typeof raw.type !== 'string' || !KNOWN_TYPES.has(raw.type)) continue;
      EventSchemas.parse(raw);
      consume(raw as AgentEvent);
    }
  }
}

/**
 * Talks to the portfolio assistant with the AG-UI protocol. One client is one conversation (thread).
 *
 * The server keeps the thread history, so each run sends only the new turn and the item context.
 * A tool call ends the run. The client executes the tool at once and starts a run with all tool results.
 * A turn that the server did not complete stays here. `retry` sends the same turn again, not a new copy.
 * When the server thread does not agree with the turn, the client continues in a new thread.
 */
export class AgUiClient {
  private threadId = MessageId.create();
  private turn: AgentMessage[] | null = null;

  constructor(private readonly api: ApiClient, private readonly execute: (call: ToolCall) => ToolResult,
    private readonly context: () => ItemContext) {}

  /** Sends a new member message. Tool results that wait from a failed run go to the server first. */
  async send(text: string, signal: AbortSignal, consume: EventConsumer): Promise<void> {
    if (this.turn?.[0]?.role === 'tool') await this.complete(signal, consume);
    this.turn = [{ id: MessageId.create(), role: 'user', content: text }];
    await this.complete(signal, consume);
  }

  /** Sends the turn of the failed run again: the same member message, or the same tool results. */
  async retry(signal: AbortSignal, consume: EventConsumer): Promise<void> {
    await this.complete(signal, consume);
  }

  private async complete(signal: AbortSignal, consume: EventConsumer): Promise<void> {
    let newThreads = 0;
    for (let round = 0; this.turn; round++) {
      if (round === ROUND_LIMIT) throw new Error('The assistant made too many proposals in one answer.');
      try {
        const calls = await this.run(this.turn, signal, consume);
        this.turn = calls.length ? calls.map(call => ({ id: MessageId.create(), role: 'tool' as const, toolCallId: call.id,
          content: JSON.stringify(this.execute(call)) })) : null;
      } catch (error) {
        if (!(error instanceof AssistantRunError) || error.code !== AssistantRunError.threadCode || newThreads++ > 0) throw error;
        this.startNewThread();
      }
    }
  }

  /**
   * The server thread is gone or has a different state, for example after a broken connection or 30 minutes.
   * A member message goes to a new thread. Tool results have no meaning in a new thread, and the form already shows the proposals.
   */
  private startNewThread(): void {
    this.threadId = MessageId.create();
    if (this.turn?.[0]?.role === 'tool') this.turn = null;
  }

  private async run(messages: AgentMessage[], signal: AbortSignal, consume: EventConsumer): Promise<ToolCall[]> {
    const calls = new Map<string, ToolCall>();
    let finished = false;
    const response = await fetch('/api/portfolio/assistant', { method: 'POST', credentials: 'same-origin', signal,
      headers: { ...this.api.headers(), Accept: 'text/event-stream' },
      body: JSON.stringify({ threadId: this.threadId, runId: MessageId.create(), messages,
        tools: AssistantTools.definitions, state: this.context(), context: [], forwardedProps: {} }) });
    await this.api.check(response);
    if (!response.body) throw new Error('The server did not return an event stream.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder(); const sse = new SseDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        sse.append(done ? decoder.decode() : decoder.decode(value, { stream: true }), event => {
          if (event.type === EventType.RUN_ERROR) throw new AssistantRunError(String(event.message), String(event.code ?? ''));
          if (event.type === EventType.RUN_FINISHED) finished = true;
          this.track(event, calls);
          consume(event);
        });
        if (done) break;
      }
    } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
    if (!finished) throw new Error('The connection closed before the answer was complete.');
    return [...calls.values()];
  }

  /** Collects the tool calls of one run. A repeated start event does not reset the collected arguments. */
  private track(event: AgentEvent, calls: Map<string, ToolCall>): void {
    const id = String(event.toolCallId);
    if (event.type === EventType.TOOL_CALL_START && !calls.has(id)) calls.set(id, { id, name: String(event.toolCallName), args: '' });
    if (event.type === EventType.TOOL_CALL_ARGS) {
      const call = calls.get(id);
      if (call) call.args += String(event.delta);
    }
  }
}
