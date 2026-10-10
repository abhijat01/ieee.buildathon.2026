import { describe, expect, it } from 'vitest';
import type { AgentEvent } from './AgUiClient';
import { AssistantConversation, type AssistantEntry } from './AssistantConversation';

const event = (value: object): AgentEvent => value as AgentEvent;
const started = event({ type: 'RUN_STARTED', threadId: 't', runId: 'r' });
const text = (messageId: string, delta: string) => event({ type: 'TEXT_MESSAGE_CONTENT', messageId, delta });
const toolCall = (toolCallId: string) => event({ type: 'TOOL_CALL_START', toolCallId, toolCallName: 'proposeText' });
const answer = (conversation: AssistantConversation) => conversation.view().at(-1) as AssistantEntry;

describe('AssistantConversation', () => {
  it('adds the member message and one answer that waits for the agent', () => {
    const conversation = new AssistantConversation();
    conversation.ask('Improve the text.');
    expect(conversation.view()).toEqual([{ kind: 'member', id: 'entry-1', text: 'Improve the text.' },
      { kind: 'assistant', id: 'entry-2', text: '', activityIds: [], working: true, error: null }]);
  });

  it('builds one answer from the events of two runs, with the tool calls in order', () => {
    const conversation = new AssistantConversation();
    conversation.ask('Improve the text.');
    for (const next of [started, text('m1', 'I made the text '), text('m1', 'more active.'), toolCall('call-1'), toolCall('call-1'),
      event({ type: 'TOOL_CALL_ARGS', toolCallId: 'call-1', delta: '{"text":"secret arguments"}' }), started, text('m2', 'Check it.')])
      conversation.apply(next);
    conversation.finish();
    expect(answer(conversation)).toMatchObject({ text: 'I made the text more active.\n\nCheck it.', activityIds: ['call-1'], working: false });
    expect(JSON.stringify(conversation.view())).not.toContain('secret arguments');
  });

  it('a failed run shows the error and removes the output of that run', () => {
    const conversation = new AssistantConversation();
    conversation.ask('Improve the text.');
    for (const next of [started, text('m1', 'Here.'), toolCall('call-1'), started, text('m2', 'Half an ans')]) conversation.apply(next);
    conversation.fail('The assistant could not answer. Your changes are safe.');
    expect(answer(conversation)).toMatchObject({ text: 'Here.', activityIds: ['call-1'], working: false, error: 'The assistant could not answer. Your changes are safe.' });
  });

  it('try again opens the same answer and adds no second member message', () => {
    const conversation = new AssistantConversation();
    conversation.ask('Improve the text.');
    conversation.fail('Failed.');
    conversation.retry();
    expect(answer(conversation)).toMatchObject({ working: true, error: null });
    conversation.apply(started); conversation.apply(text('m1', 'Done.')); conversation.finish();
    expect(conversation.view().map(entry => entry.kind)).toEqual(['member', 'assistant']);
    expect(answer(conversation).text).toBe('Done.');
  });

  it('knows when the assistant waits for an answer of the member', () => {
    const conversation = new AssistantConversation();
    expect(conversation.awaitsAnswer()).toBe(false);
    conversation.ask('Ask me for missing facts.');
    conversation.apply(text('m1', 'How many people used your work? Answer in your own words.'));
    expect(conversation.awaitsAnswer()).toBe(false);
    conversation.finish();
    expect(conversation.awaitsAnswer()).toBe(true);
    conversation.ask('40 people.');
    conversation.apply(text('m2', 'Thank you. Is this correct?')); conversation.apply(toolCall('call-1')); conversation.finish();
    expect(conversation.awaitsAnswer()).toBe(false);
  });

  it('ignores events without an open answer and returns copies', () => {
    const conversation = new AssistantConversation();
    conversation.apply(text('m1', 'Late text'));
    conversation.fail('Late'); conversation.retry();
    expect(conversation.view()).toEqual([]);
    conversation.ask('Hello');
    answer(conversation).activityIds.push('other');
    expect(answer(conversation).activityIds).toEqual([]);
  });
});
