import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgUiClient, AssistantRunError, SseDecoder, type ItemContext } from './AgUiClient';
import { ApiClient, AuthenticationRequired } from './ApiClient';
import type { ToolCall, ToolResult } from './AssistantTools';

afterEach(() => vi.unstubAllGlobals());

const FINISHED = { type: 'RUN_FINISHED', threadId: 't', runId: 'r' };
const SHOWN: ToolResult = { status: 'shown', message: 'Shown.' };
const PROPOSE = [
  { type: 'TOOL_CALL_START', toolCallId: 'call-1', toolCallName: 'proposeSkills' },
  { type: 'TOOL_CALL_ARGS', toolCallId: 'call-1', delta: '{"skills":' },
  { type: 'TOOL_CALL_ARGS', toolCallId: 'call-1', delta: '["Docker"]}' },
  { type: 'TOOL_CALL_START', toolCallId: 'call-1', toolCallName: 'proposeSkills' },
  { type: 'TOOL_CALL_END', toolCallId: 'call-1' }, FINISHED];

class Fixture {
  readonly fetch = vi.fn();
  readonly execute = vi.fn((_call: ToolCall): ToolResult => SHOWN);
  context: ItemContext = { itemId: 'a1', type: 'PROJECT', title: 'Atlas', company: '', startDate: '', endDate: '', skills: ['Python'],
    text: 'I built Atlas.', unsavedChanges: false, decisions: [] };
  readonly client: AgUiClient;
  readonly signal = new AbortController().signal;

  constructor() {
    const api = new ApiClient();
    vi.spyOn(api, 'headers').mockReturnValue({ 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'token' });
    vi.stubGlobal('fetch', this.fetch);
    this.client = new AgUiClient(api, this.execute, () => this.context);
  }

  /** Adds one server answer for each list of events. */
  answers(...streams: object[][]): this {
    for (const events of streams) this.fetch.mockResolvedValueOnce(new Response(new ReadableStream({ start(controller) {
      for (const event of events) controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
      controller.close();
    } }), { headers: { 'Content-Type': 'text/event-stream' } }));
    return this;
  }

  body(call: number) { return JSON.parse(this.fetch.mock.calls[call][1].body); }
}

describe('SseDecoder', () => {
  it('decodes events that are split across network chunks', () => {
    const decoder = new SseDecoder(); const consume = vi.fn();
    decoder.append('data: {"type":"TEXT_MESSAGE_CON', consume);
    expect(consume).not.toHaveBeenCalled();
    decoder.append('TENT","messageId":"a","delta":"Hi"}\n\ndata: {"type":"RUN_FINISHED","threadId":"t","runId":"r"}\n\n', consume);
    expect(consume.mock.calls.map(call => call[0].type)).toEqual(['TEXT_MESSAGE_CONTENT', 'RUN_FINISHED']);
    expect(consume.mock.calls[0][0].delta).toBe('Hi');
  });

  it('ignores keepalive comments and event types that it does not know', () => {
    const decoder = new SseDecoder(); const consume = vi.fn();
    decoder.append(': keepalive\r\n\r\ndata: {"type":"SOMETHING_NEW","name":"x"}\n\n', consume);
    decoder.append('data: {"type":"CUSTOM","name":"usage","value":{}}\n\n', consume);
    expect(consume.mock.calls.map(call => call[0].type)).toEqual(['CUSTOM']);
  });
});

describe('AgUiClient', () => {
  it('sends the turn to the assistant endpoint with the CSRF header and the session cookie', async () => {
    const fixture = new Fixture().answers([FINISHED]);
    await fixture.client.send('Improve the text.', fixture.signal, vi.fn());
    const [path, options] = fixture.fetch.mock.calls[0];
    expect(path).toBe('/api/portfolio/assistant');
    expect(options).toMatchObject({ method: 'POST', credentials: 'same-origin', signal: fixture.signal,
      headers: { 'X-CSRF-TOKEN': 'token', 'Content-Type': 'application/json', Accept: 'text/event-stream' } });
  });

  it('sends only the new member message, the tool names, and the current item context with each turn', async () => {
    const fixture = new Fixture().answers([FINISHED], [FINISHED]);
    await fixture.client.send('First', fixture.signal, vi.fn());
    fixture.context = { ...fixture.context, title: 'Atlas 2', unsavedChanges: true, decisions: [{ proposal: 'Skill: Docker', outcome: 'rejected' }] };
    await fixture.client.send('Second', fixture.signal, vi.fn());
    const [first, second] = [fixture.body(0), fixture.body(1)];
    expect(first.messages).toEqual([{ id: expect.any(String), role: 'user', content: 'First' }]);
    expect(first.state).toMatchObject({ itemId: 'a1', title: 'Atlas', unsavedChanges: false, decisions: [] });
    expect(second.messages).toEqual([{ id: expect.any(String), role: 'user', content: 'Second' }]);
    expect(second.state).toMatchObject({ title: 'Atlas 2', unsavedChanges: true, decisions: [{ proposal: 'Skill: Docker', outcome: 'rejected' }] });
    expect(second.threadId).toBe(first.threadId);
    expect(second.runId).not.toBe(first.runId);
    expect(second.tools).toEqual([{ name: 'proposeText', description: expect.any(String) }, { name: 'proposeSkills', description: expect.any(String) },
      { name: 'proposeFields', description: expect.any(String) }]);
  });

  it('gives each event of the stream to the consumer in order', async () => {
    const fixture = new Fixture().answers([{ type: 'RUN_STARTED', threadId: 't', runId: 'r' }, { type: 'TEXT_MESSAGE_START', messageId: 'm', role: 'assistant' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'Hello' }, { type: 'TEXT_MESSAGE_END', messageId: 'm' }, FINISHED]);
    const consume = vi.fn();
    await fixture.client.send('Hi', fixture.signal, consume);
    expect(consume.mock.calls.map(call => call[0].type)).toEqual(['RUN_STARTED', 'TEXT_MESSAGE_START', 'TEXT_MESSAGE_CONTENT', 'TEXT_MESSAGE_END', 'RUN_FINISHED']);
  });

  it('executes a tool call one time and starts a second run with the tool result at once', async () => {
    const fixture = new Fixture().answers(PROPOSE, [FINISHED]);
    await fixture.client.send('Suggest skills.', fixture.signal, vi.fn());
    expect(fixture.execute).toHaveBeenCalledTimes(1);
    expect(fixture.execute).toHaveBeenCalledWith({ id: 'call-1', name: 'proposeSkills', args: '{"skills":["Docker"]}' });
    expect(fixture.fetch).toHaveBeenCalledTimes(2);
    expect(fixture.body(1).messages).toEqual([{ id: expect.any(String), role: 'tool', toolCallId: 'call-1', content: JSON.stringify(SHOWN) }]);
    expect(fixture.body(1).threadId).toBe(fixture.body(0).threadId);
  });

  it('try again after a failed first run sends the same member message and no second copy', async () => {
    const fixture = new Fixture().answers([{ type: 'RUN_STARTED', threadId: 't', runId: 'r' },
      { type: 'RUN_ERROR', message: 'The assistant could not answer. Your changes are safe.' }], [FINISHED]);
    const failed = fixture.client.send('Improve the text.', fixture.signal, vi.fn());
    await expect(failed).rejects.toBeInstanceOf(AssistantRunError);
    await expect(failed).rejects.toThrow('The assistant could not answer. Your changes are safe.');
    await fixture.client.retry(fixture.signal, vi.fn());
    expect(fixture.fetch).toHaveBeenCalledTimes(2);
    expect(fixture.body(1).messages).toEqual(fixture.body(0).messages);
    expect(fixture.body(1).messages).toHaveLength(1);
    await fixture.client.retry(fixture.signal, vi.fn());
    expect(fixture.fetch).toHaveBeenCalledTimes(2);
  });

  it('try again after a failed tool result run sends the tool results again and not the member message', async () => {
    const fixture = new Fixture().answers(PROPOSE, [{ type: 'RUN_ERROR', message: 'Failed.' }], [FINISHED]);
    await expect(fixture.client.send('Suggest skills.', fixture.signal, vi.fn())).rejects.toThrow('Failed.');
    await fixture.client.retry(fixture.signal, vi.fn());
    expect(fixture.execute).toHaveBeenCalledTimes(1);
    expect(fixture.body(2).messages).toEqual(fixture.body(1).messages);
    expect(fixture.body(2).messages).toEqual([expect.objectContaining({ role: 'tool', toolCallId: 'call-1' })]);
  });

  it('sends the waiting tool results before a new member message', async () => {
    const fixture = new Fixture().answers(PROPOSE, [{ type: 'RUN_ERROR', message: 'Failed.' }], [FINISHED], [FINISHED]);
    await expect(fixture.client.send('Suggest skills.', fixture.signal, vi.fn())).rejects.toThrow('Failed.');
    await fixture.client.send('And now the text.', fixture.signal, vi.fn());
    expect(fixture.body(2).messages).toEqual(fixture.body(1).messages);
    expect(fixture.body(3).messages).toEqual([expect.objectContaining({ role: 'user', content: 'And now the text.' })]);
  });

  it('continues in a new thread when the server thread does not agree with the member message', async () => {
    const threadError = { type: 'RUN_ERROR', message: 'The assistant waits for the result of a proposal. Try again.', code: 'ASSISTANT_THREAD_ERROR' };
    const fixture = new Fixture().answers([FINISHED], [threadError], [FINISHED]);
    await fixture.client.send('First', fixture.signal, vi.fn());
    await fixture.client.send('Second', fixture.signal, vi.fn());
    expect(fixture.body(1).threadId).toBe(fixture.body(0).threadId);
    expect(fixture.body(2).threadId).not.toBe(fixture.body(1).threadId);
    expect(fixture.body(2).messages).toEqual(fixture.body(1).messages);
    const twice = new Fixture().answers([threadError], [threadError]);
    await expect(twice.client.send('Hello', twice.signal, vi.fn())).rejects.toThrow('The assistant waits');
    expect(twice.fetch).toHaveBeenCalledTimes(2);
  });

  it('drops tool results that the server thread does not know, and the next message uses a new thread', async () => {
    const threadError = { type: 'RUN_ERROR', message: 'The assistant did not get the result of each proposal. Try again.', code: 'ASSISTANT_THREAD_ERROR' };
    const fixture = new Fixture().answers(PROPOSE, [threadError], [FINISHED]);
    await fixture.client.send('Suggest skills.', fixture.signal, vi.fn());
    expect(fixture.fetch).toHaveBeenCalledTimes(2);
    await fixture.client.retry(fixture.signal, vi.fn());
    expect(fixture.fetch).toHaveBeenCalledTimes(2);
    await fixture.client.send('Next', fixture.signal, vi.fn());
    expect(fixture.body(2).messages).toEqual([expect.objectContaining({ role: 'user', content: 'Next' })]);
    expect(fixture.body(2).threadId).not.toBe(fixture.body(0).threadId);
  });

  it('reports an incomplete stream, an expired session, and too many tool rounds', async () => {
    const incomplete = new Fixture().answers([]);
    await expect(incomplete.client.send('Hello', incomplete.signal, vi.fn())).rejects.toThrow('closed before');
    const expired = new Fixture();
    expired.fetch.mockResolvedValueOnce(new Response('', { status: 401 }));
    await expect(expired.client.send('Hello', expired.signal, vi.fn())).rejects.toBeInstanceOf(AuthenticationRequired);
    const endless = new Fixture().answers(PROPOSE, PROPOSE, PROPOSE, PROPOSE, PROPOSE, PROPOSE, PROPOSE);
    await expect(endless.client.send('Hello', endless.signal, vi.fn())).rejects.toThrow('too many proposals');
    expect(endless.fetch).toHaveBeenCalledTimes(6);
  });
});
