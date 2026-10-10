import { describe, expect, it } from 'vitest';
import { AgentTranscript, type AssistantEntry } from './AgentTranscript';
import type { AgentEvent } from './AgUiClient';

class Events {
  static of(...events: object[]): AgentEvent[] { return events as AgentEvent[]; }
  static tool(id: string, name: string, args: string, result = true): object[] {
    return [{ type: 'TOOL_CALL_START', toolCallId: id, toolCallName: name, parentMessageId: 'p' },
      { type: 'TOOL_CALL_ARGS', toolCallId: id, delta: args }, { type: 'TOOL_CALL_END', toolCallId: id },
      ...(result ? [{ type: 'TOOL_CALL_RESULT', messageId: `r-${id}`, toolCallId: id, content: '{"secret":"raw"}', role: 'tool' }] : [])];
  }
}

class Transcript {
  static run(...events: object[]): { transcript: AgentTranscript; turn: () => AssistantEntry } {
    const transcript = new AgentTranscript();
    transcript.addUser('u1', 'Hello'); transcript.startTurn('a1');
    for (const event of Events.of(...events)) transcript.apply(event);
    return { transcript, turn: () => transcript.view()[1] as AssistantEntry };
  }
}

describe('Agent transcript', () => {
  it('joins streamed deltas and ignores empty tool-only text messages', () => {
    const { turn } = Transcript.run(
      { type: 'TEXT_MESSAGE_START', messageId: 'tool-parent', role: 'assistant' }, { type: 'TEXT_MESSAGE_END', messageId: 'tool-parent' },
      { type: 'TEXT_MESSAGE_START', messageId: 'm1', role: 'assistant' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: 'Hello ' }, { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: 'there.' });
    expect(turn().text).toBe('Hello there.');
    expect(turn().visible).toBe(true);
  });
  it('stays hidden until the first visible event', () => {
    const { turn } = Transcript.run({ type: 'RUN_STARTED', threadId: 't', runId: 'r' },
      { type: 'TEXT_MESSAGE_START', messageId: 'p', role: 'assistant' }, { type: 'STATE_SNAPSHOT', snapshot: {} },
      { type: 'CUSTOM', name: 'usage', value: {} }, { type: 'MESSAGES_SNAPSHOT', messages: [] });
    expect(turn().visible).toBe(false);
    expect(turn().activities).toEqual([]);
  });
  it('shows friendly tool activity without raw arguments or results and merges repeats', () => {
    const { transcript, turn } = Transcript.run(
      ...Events.tool('c1', 'fetchWebsite', '{"url":"https://www.example.com/a?token=1"}'),
      ...Events.tool('c2', 'fetchWebsite', '{"url":"https://example.com/b"}'),
      { type: 'TOOL_CALL_START', toolCallId: 'c1', toolCallName: 'fetchWebsite' },
      ...Events.tool('c3', 'browseWebsite', '{"url":"https://docs.example.org"}', false));
    expect(turn().activities).toEqual([
      { key: 'fetchWebsite:example.com', name: 'fetchWebsite', label: 'Read website', detail: 'example.com', count: 2, done: true },
      { key: 'browseWebsite:docs.example.org', name: 'browseWebsite', label: 'Browsing website', detail: 'docs.example.org', count: 1, done: false }]);
    expect(JSON.stringify(transcript.view())).not.toContain('secret');
    expect(JSON.stringify(transcript.view())).not.toContain('token');
    transcript.finishTurn();
    expect(turn().working).toBe(false);
    expect(turn().activities.every(activity => activity.done)).toBe(true);
  });
  it('keeps one assistant entry across browser tool runs', () => {
    const { transcript, turn } = Transcript.run(...Events.tool('t1', 'setTheme', '{"theme":"dark"}', false),
      { type: 'RUN_FINISHED', threadId: 't', runId: 'r1' }, { type: 'TOOL_CALL_RESULT', toolCallId: 't1', content: '{}' },
      { type: 'RUN_STARTED', threadId: 't', runId: 'r2' }, { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm2', delta: 'Done.' });
    expect(transcript.view()).toHaveLength(2);
    expect(turn().activities).toEqual([{ key: 'setTheme:dark', name: 'setTheme', label: 'Updated theme', detail: 'dark', count: 1, done: true }]);
    expect(turn().text).toBe('Done.');
  });
});
