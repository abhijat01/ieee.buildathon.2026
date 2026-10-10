import { MessageId } from './MessageId';
import { EventSchemas, EventType, type BaseEvent } from '@ag-ui/core';
import { ApiClient } from './ApiClient';
import { BrowserTools } from './BrowserTools';

export interface AgentMessage { id: string; role: 'user' | 'tool'; content: string; toolCallId?: string }
export type AgentEvent = BaseEvent & Record<string, unknown>;

const KNOWN_TYPES = new Set<string>(Object.values(EventType));

export class SseDecoder {
  private buffer = '';

  /** Decode complete frames. Skip comments (keepalive) and event types that this client does not know. */
  append(chunk: string, consume: (event: AgentEvent) => void): void {
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

interface BrowserCall { name: string; args: string }

export class AgUiClient {
  private readonly threadId = MessageId.create();

  constructor(private readonly api: ApiClient, private readonly tools: BrowserTools) {}

  /** Run one member turn. The server keeps the thread history, so each run sends only the new messages. */
  async send(text: string, signal: AbortSignal, consume: (event: AgentEvent) => void): Promise<void> {
    let turn: AgentMessage[] = [{ id: MessageId.create(), role: 'user', content: text }];
    for (let round = 0; round < 6; round++) {
      const calls = await this.run(turn, signal, consume);
      if (!calls.size) return;
      turn = [];
      for (const [id, call] of calls) {
        let result: Record<string, string>;
        try { result = this.tools.execute(call.name, call.args); }
        catch (error) { result = { status: 'error', message: error instanceof Error ? error.message : 'Browser action failed.' }; }
        turn.push({ id: MessageId.create(), role: 'tool', toolCallId: id, content: JSON.stringify(result) });
        consume({ type: EventType.TOOL_CALL_RESULT, toolCallId: id, content: JSON.stringify(result) } as AgentEvent);
      }
    }
    throw new Error('The agent reached the browser action limit. Start a new conversation.');
  }

  private async run(messages: AgentMessage[], signal: AbortSignal, consume: (event: AgentEvent) => void): Promise<Map<string, BrowserCall>> {
    const calls = new Map<string, BrowserCall>();
    let finished = false;
    const response = await fetch('/api/agent', { method: 'POST', credentials: 'same-origin', signal,
      headers: { ...this.api.headers(), Accept: 'text/event-stream' },
      body: JSON.stringify({ threadId: this.threadId, runId: MessageId.create(), messages,
        tools: BrowserTools.definitions, state: {}, context: [], forwardedProps: {} }) });
    await this.api.check(response);
    if (!response.body) throw new Error('The server did not return an agent stream.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder(); const sse = new SseDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        sse.append(done ? decoder.decode() : decoder.decode(value, { stream: true }), event => {
          if (event.type === EventType.RUN_ERROR) throw new Error(String(event.message));
          if (event.type === EventType.RUN_FINISHED) finished = true;
          this.track(event, calls);
          consume(event);
        });
        if (done) break;
      }
    } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
    if (!finished) throw new Error('The agent connection closed before the response was complete.');
    return calls;
  }

  /** Collect browser tool calls. A repeated start event does not reset the collected arguments. */
  private track(event: AgentEvent, calls: Map<string, BrowserCall>): void {
    const id = String(event.toolCallId);
    if (event.type === EventType.TOOL_CALL_START && BrowserTools.supports(String(event.toolCallName)) && !calls.has(id))
      calls.set(id, { name: String(event.toolCallName), args: '' });
    if (event.type === EventType.TOOL_CALL_ARGS) {
      const call = calls.get(id);
      if (call) call.args += String(event.delta);
    }
  }
}
