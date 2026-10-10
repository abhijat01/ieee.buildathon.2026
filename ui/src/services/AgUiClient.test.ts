import { describe, expect, it, vi } from 'vitest';
import { SseDecoder, AgUiClient } from './AgUiClient';
import { ApiClient } from './ApiClient';
import { BrowserTools } from './BrowserTools';

class Fixtures {
  static response(events: object[]) {
    return new Response(new ReadableStream({ start(controller) {
      for (const event of events) controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
      controller.close();
    } }), { headers: { 'Content-Type': 'text/event-stream' } });
  }
}

describe('AG-UI transport', () => {
  it('decodes events split across network chunks', () => {
    const decoder = new SseDecoder(); const consume = vi.fn();
    decoder.append('data: {"type":"TEXT_MESSAGE_CON', consume);
    expect(consume).not.toHaveBeenCalled();
    decoder.append('TENT","messageId":"a","delta":"Hi"}\n\ndata: {"type":"RUN_FINISHED","threadId":"t","runId":"r"}\n\n', consume);
    expect(consume).toHaveBeenCalledTimes(2);
    expect(consume.mock.calls[0][0].delta).toBe('Hi');
  });
  it('ignores keepalive comments and event types that it does not know', () => {
    const decoder = new SseDecoder(); const consume = vi.fn();
    decoder.append(': keepalive\r\n\r\ndata: {"type":"SUBAGENT_STARTED","name":"x"}\n\n', consume);
    decoder.append('data: {"type":"CUSTOM","name":"usage","value":{}}\n\n', consume);
    expect(consume.mock.calls.map(call => call[0].type)).toEqual(['CUSTOM']);
  });
  it('sends only the new member message because the server keeps the history', async () => {
    const api = new ApiClient(); vi.spyOn(api, 'headers').mockReturnValue({});
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(Fixtures.response([{ type: 'RUN_FINISHED', threadId: 't', runId: 'r' }])));
    vi.stubGlobal('fetch', fetch);
    const client = new AgUiClient(api, new BrowserTools(vi.fn()));
    await client.send('First', new AbortController().signal, vi.fn());
    await client.send('Second', new AbortController().signal, vi.fn());
    const second = JSON.parse(fetch.mock.calls[1][1].body);
    expect(second.messages).toEqual([expect.objectContaining({ role: 'user', content: 'Second' })]);
    expect(second.threadId).toBe(JSON.parse(fetch.mock.calls[0][1].body).threadId);
    expect(second.tools.map((tool: { name: string }) => tool.name)).toEqual(['setTheme']);
  });
  it('executes a browser tool and sends its result in the next run', async () => {
    const api = new ApiClient(); vi.spyOn(api, 'headers').mockReturnValue({});
    const tools = new BrowserTools(vi.fn()); vi.spyOn(tools, 'execute').mockReturnValue({ status: 'success', theme: 'dark' });
    const fetch = vi.fn().mockResolvedValueOnce(Fixtures.response([
      { type: 'TOOL_CALL_START', toolCallId: 'call-1', toolCallName: 'setTheme' },
      { type: 'TOOL_CALL_ARGS', toolCallId: 'call-1', delta: '{"theme":"dark"}' },
      { type: 'TOOL_CALL_START', toolCallId: 'call-1', toolCallName: 'setTheme' },
      { type: 'TOOL_CALL_END', toolCallId: 'call-1' },
      { type: 'RUN_FINISHED', threadId: 't', runId: 'r' },
    ])).mockResolvedValueOnce(Fixtures.response([{ type: 'RUN_FINISHED', threadId: 't', runId: 'r2' }]));
    vi.stubGlobal('fetch', fetch);
    await new AgUiClient(api, tools).send('Dark theme please', new AbortController().signal, vi.fn());
    expect(tools.execute).toHaveBeenCalledWith('setTheme', '{"theme":"dark"}');
    const resumed = JSON.parse(fetch.mock.calls[1][1].body);
    expect(tools.execute).toHaveBeenCalledTimes(1);
    expect(resumed.messages).toHaveLength(1);
    expect(resumed.messages.at(-1)).toMatchObject({ role: 'tool', toolCallId: 'call-1' });
    expect(JSON.parse(resumed.messages.at(-1).content).status).toBe('success');
  });
  it('reports run errors and incomplete streams', async () => {
    const api = new ApiClient(); vi.spyOn(api, 'headers').mockReturnValue({});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Fixtures.response([{ type: 'RUN_ERROR', message: 'Missing key' }]))
      .mockResolvedValueOnce(Fixtures.response([])));
    const client = new AgUiClient(api, new BrowserTools(vi.fn()));
    await expect(client.send('Hello', new AbortController().signal, vi.fn())).rejects.toThrow('Missing key');
    await expect(client.send('Hello', new AbortController().signal, vi.fn())).rejects.toThrow('closed before');
  });
});
