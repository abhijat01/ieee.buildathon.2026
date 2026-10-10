import { expect, type Page, type Route } from '@playwright/test';

/** One answer of the simulated agent: text, one tool call, or a run error. */
export interface Reply { text?: string; tool?: { name: string; args: object }; error?: string }
interface RunBody { threadId: string; runId: string; messages: { id: string; role: string; content: string; toolCallId?: string }[];
  tools: { name: string }[]; state: Record<string, unknown> }

/** Simulates the AG-UI event stream of the portfolio assistant in the browser. No model runs. */
export class AssistantFixture {
  static readonly failure = 'The assistant could not answer. Your changes are safe.';
  /** The bodies of all runs, in order. */
  readonly requests: RunBody[] = [];
  /** The answers to runs with tool results. The default answer has no text. */
  readonly resultReplies: Reply[] = [];
  private readonly replies: Reply[] = [];
  private gate: Promise<void> | null = null;
  private release: () => void = () => undefined;
  private calls = 0;

  static async attach(page: Page): Promise<AssistantFixture> {
    const fixture = new AssistantFixture();
    await page.route('**/api/portfolio/assistant', route => fixture.run(route));
    return fixture;
  }

  /** Adds the answers to the next member messages. */
  reply(...replies: Reply[]): this { this.replies.push(...replies); return this; }

  /** Holds the next answers until the test calls the returned function. */
  hold(): () => void { this.gate = new Promise(resolve => { this.release = resolve; }); return () => { this.release(); this.gate = null; }; }

  /** The runs that carry a member message. */
  memberRuns(): RunBody[] { return this.requests.filter(body => body.messages[0].role === 'user'); }

  private async run(route: Route): Promise<void> {
    const body = route.request().postDataJSON() as RunBody;
    expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
    expect(body.tools.map(tool => tool.name)).toEqual(['proposeText', 'proposeSkills', 'proposeFields']);
    this.requests.push(body);
    if (this.gate) await this.gate;
    const queue = body.messages[0].role === 'tool' ? this.resultReplies : this.replies;
    const frames = this.events(body, queue.shift() ?? {}).map(event => `data: ${JSON.stringify(event)}\n\n`);
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body: `: keepalive\n\n${frames.join('')}` });
  }

  private events(body: RunBody, reply: Reply): object[] {
    const run = { threadId: body.threadId, runId: body.runId };
    const events: object[] = [{ type: 'RUN_STARTED', ...run }];
    if (reply.text) {
      const messageId = `text-${body.runId}`, half = Math.ceil(reply.text.length / 2);
      events.push({ type: 'TEXT_MESSAGE_START', messageId, role: 'assistant' },
        { type: 'TEXT_MESSAGE_CONTENT', messageId, delta: reply.text.slice(0, half) },
        { type: 'TEXT_MESSAGE_CONTENT', messageId, delta: reply.text.slice(half) }, { type: 'TEXT_MESSAGE_END', messageId });
    }
    if (reply.tool) {
      const toolCallId = `call-${++this.calls}`;
      events.push({ type: 'TOOL_CALL_START', toolCallId, toolCallName: reply.tool.name },
        { type: 'TOOL_CALL_ARGS', toolCallId, delta: JSON.stringify(reply.tool.args) }, { type: 'TOOL_CALL_END', toolCallId });
    }
    events.push(reply.error ? { type: 'RUN_ERROR', message: reply.error, code: 'ASSISTANT_ERROR' } : { type: 'RUN_FINISHED', ...run });
    return events;
  }
}
