import { test, expect, type Page } from '@playwright/test';

class WorkspaceFixture {
  static async signedIn(page: Page) {
    const notes: object[] = [];
    await page.route('**/api/session', route => route.fulfill({ json: { name: 'Abhijat', email: 'abhijat@example.test',
      csrfToken: 'test-csrf', csrfHeader: 'X-CSRF-TOKEN', agentAvailable: true } }));
    await page.route('**/api/notes', async route => {
      if (route.request().method() === 'POST') {
        const note = { id: '1', ...route.request().postDataJSON(), createdAt: new Date().toISOString() };
        notes.push(note); await route.fulfill({ json: note });
      } else await route.fulfill({ json: notes });
    });
    await page.goto('/'); await expect(page.getByRole('heading', { name: 'Workspace', exact: true })).toBeVisible();
  }
  static async openAgent(page: Page) {
    if (!(await page.locator('.agent-panel').isVisible())) await page.getByRole('button', { name: 'IEEEAgent', exact: true }).click();
  }
  static eventStream(events: object[]) { return events.map(event => `data: ${JSON.stringify(event)}\n\n`).join(''); }
}

/** Event sequences in the shape that the MAF AG-UI runner sends. */
class MafEvents {
  static run(input: { threadId: string; runId: string }, ...body: object[][]): object[] {
    return [{ type: 'RUN_STARTED', threadId: input.threadId, runId: input.runId }, ...body.flat(),
      { type: 'RUN_FINISHED', threadId: input.threadId, runId: input.runId }];
  }
  static serverTool(id: string, name: string, args: object, result: object): object[] {
    return [{ type: 'TEXT_MESSAGE_START', messageId: `parent-${id}`, role: 'assistant' },
      { type: 'TOOL_CALL_START', toolCallId: id, toolCallName: name, parentMessageId: `parent-${id}` },
      { type: 'TOOL_CALL_ARGS', toolCallId: id, delta: JSON.stringify(args) }, { type: 'TOOL_CALL_END', toolCallId: id },
      { type: 'TOOL_CALL_RESULT', messageId: `result-${id}`, toolCallId: id, content: JSON.stringify(result), role: 'tool' },
      { type: 'TEXT_MESSAGE_END', messageId: `parent-${id}` }];
  }
  static browserTool(id: string, name: string, args: object): object[] {
    return [{ type: 'TEXT_MESSAGE_START', messageId: `parent-${id}`, role: 'assistant' },
      { type: 'TOOL_CALL_START', toolCallId: id, toolCallName: name, parentMessageId: `parent-${id}` },
      { type: 'TOOL_CALL_ARGS', toolCallId: id, delta: JSON.stringify(args) }, { type: 'TOOL_CALL_END', toolCallId: id },
      { type: 'TEXT_MESSAGE_END', messageId: `parent-${id}` }];
  }
  static text(id: string, ...deltas: string[]): object[] {
    return [{ type: 'TEXT_MESSAGE_START', messageId: id, role: 'assistant' },
      ...deltas.map(delta => ({ type: 'TEXT_MESSAGE_CONTENT', messageId: id, delta })), { type: 'TEXT_MESSAGE_END', messageId: id }];
  }
}

test('sign-in uses the protected OIDC route', async ({ page }) => {
  await page.route('**/api/session', route => route.fulfill({ status: 401 }));
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Sign in to your workspace' })).toHaveAttribute('href', '/oauth2/authorization/authentik');
  await page.screenshot({ path: 'test-results/sign-in.png', fullPage: true });
});

test('member can save a note and change both themes', async ({ page }, testInfo) => {
  await WorkspaceFixture.signedIn(page);
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: `test-results/${testInfo.project.name}-dark.png`, fullPage: true });
  await page.getByRole('button', { name: 'Light theme', exact: true }).click();
  await page.getByRole('button', { name: 'Go to notes', exact: true }).click();
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('A better starting point');
  await page.getByLabel('Your note', { exact: true }).fill('Explore a simple idea and turn it into something useful.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A better starting point' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-light.png`, fullPage: true });
});

test('agent executes a browser tool and resumes with its result', async ({ page }, testInfo) => {
  await WorkspaceFixture.signedIn(page);
  let runs = 0;
  await page.route('**/api/agent', async route => {
    runs++;
    const input = route.request().postDataJSON();
    if (runs === 2) expect(input.messages).toEqual([expect.objectContaining({ role: 'tool', toolCallId: 'theme-1' })]);
    const events = runs === 1 ? MafEvents.run(input, MafEvents.browserTool('theme-1', 'setTheme', { theme: 'dark' }))
      : MafEvents.run(input, MafEvents.text('reply-1', 'Your workspace now ', 'uses the dark theme.'));
    await route.fulfill({ contentType: 'text/event-stream', body: WorkspaceFixture.eventStream(events) });
  });
  await WorkspaceFixture.openAgent(page);
  await page.getByRole('textbox', { name: 'Message IEEEAgent' }).fill('Change to dark theme.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByText('Your workspace now uses the dark theme.')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.agent-activity summary')).toHaveText('Updated theme · dark');
  expect(runs).toBe(2);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-agent.png`, fullPage: false });
});

test('agent streams tool activity as one compact line and the answer in place', async ({ page }, testInfo) => {
  await WorkspaceFixture.signedIn(page);
  let release: () => void = () => undefined;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/agent', async route => {
    const input = route.request().postDataJSON();
    const first = MafEvents.run(input,
      MafEvents.serverTool('time-1', 'getCurrentTime', {}, { utc: '2026-10-09T10:00:00Z' }),
      MafEvents.serverTool('fetch-1', 'fetchWebsite', { url: 'https://www.example.com/news' }, { content: 'secret page text' }),
      MafEvents.serverTool('fetch-2', 'fetchWebsite', { url: 'https://example.com/more' }, { content: 'more' }),
      [{ type: 'CUSTOM', name: 'usage', value: { input_token_count: 10 } }],
      MafEvents.text('answer', ...'Here is a **short summary** of the example site and the current time.'.split(/(?<= )/)));
    await gate;
    await route.fulfill({ contentType: 'text/event-stream', body: ': keepalive\n\n' + WorkspaceFixture.eventStream(first) });
  });
  await WorkspaceFixture.openAgent(page);
  await page.getByRole('textbox', { name: 'Message IEEEAgent' }).fill('What time is it, and what is on example.com?');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByText('IEEEAgent is at work')).toBeVisible();
  release();
  await expect(page.locator('.agent-markdown')).toContainText('Here is a short summary of the example site and the current time.');
  await expect(page.getByText('IEEEAgent is at work')).toHaveCount(0);
  const activity = page.locator('.agent-activity');
  await expect(activity).toHaveCount(1);
  await expect(activity.locator('summary')).toHaveText('Used 3 tools');
  await expect(activity.locator('li')).toHaveCount(2);
  await expect(activity.locator('li').first()).not.toBeVisible();
  await expect(page.getByText('secret page text')).toHaveCount(0);
  await activity.locator('summary').click();
  await expect(activity.locator('li').nth(0)).toHaveText('Checked the time');
  await expect(activity.locator('li').nth(1)).toHaveText('Read website · example.com×2');
  await expect(page.locator('.agent-error')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-activity-light.png` });
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-activity-dark.png` });
});

test('activity shows one live line while the agent continues, then one summary', async ({ page }, testInfo) => {
  await WorkspaceFixture.signedIn(page);
  let runs = 0; let release: () => void = () => undefined;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/agent', async route => {
    runs++;
    const input = route.request().postDataJSON();
    if (runs === 1) return route.fulfill({ contentType: 'text/event-stream',
      body: WorkspaceFixture.eventStream(MafEvents.run(input, MafEvents.browserTool('theme-1', 'setTheme', { theme: 'dark' }))) });
    await gate;
    return route.fulfill({ contentType: 'text/event-stream', body: WorkspaceFixture.eventStream(MafEvents.run(input,
      MafEvents.serverTool('notes-1', 'listNotes', {}, { notes: [] }), MafEvents.text('done', 'Dark theme is on.'))) });
  });
  await WorkspaceFixture.openAgent(page);
  await page.getByRole('textbox', { name: 'Message IEEEAgent' }).fill('Use dark theme and read my notes.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  const summary = page.locator('.agent-activity summary');
  await expect(summary).toHaveText('Preparing the answer…');
  await expect(summary.locator('.spin')).toHaveCount(1);
  await expect(page.getByText('IEEEAgent is at work')).toHaveCount(0);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-activity-live.png` });
  release();
  await expect(page.getByText('Dark theme is on.')).toBeVisible();
  await expect(summary).toHaveText('Used 2 tools');
  await expect(summary.locator('.spin')).toHaveCount(0);
});

test('logout submits a form with the CSRF token', async ({ page }) => {
  await WorkspaceFixture.signedIn(page);
  await page.route('**/api/logout', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postData()).toBe('_csrf=test-csrf');
    await route.fulfill({ contentType: 'text/html', body: '<h1>Signed out</h1>' });
  });
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Signed out' })).toBeVisible();
});

test('agent formats streamed Markdown safely within the viewport', async ({ page }, testInfo) => {
  await WorkspaceFixture.signedIn(page);
  const response = '### Useful options\n\n- **Search BMS jobs:** [BMS careers](https://careers.bms.com/)\n- Try **AI**, **machine learning**, and **data science**.\n- Explore **Technology** and **Analytics**.\n\nBMS describes its **Analytics** functions as work with data and technology.\n\n| Area | Keywords |\n| --- | --- |\n| Technology | Artificial intelligence |\n\n```text\nA long code line that must scroll within the assistant pane rather than widen the page.\n```\n\n[Unsafe link](javascript:alert(1))\n\n<script>alert(1)</script>';
  await page.route('**/api/agent', route => route.fulfill({ contentType: 'text/event-stream',
    body: WorkspaceFixture.eventStream([
      { type: 'TEXT_MESSAGE_START', messageId: 'markdown', role: 'assistant' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'markdown', delta: response.slice(0, 33) },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'markdown', delta: response.slice(33) },
      { type: 'TEXT_MESSAGE_END', messageId: 'markdown' },
      { type: 'RUN_FINISHED', threadId: route.request().postDataJSON().threadId, runId: route.request().postDataJSON().runId },
    ]) }));
  await WorkspaceFixture.openAgent(page);
  await page.getByRole('textbox', { name: 'Message IEEEAgent' }).fill('Find AI jobs at BMS.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  const markdown = page.locator('.agent-markdown');
  await expect(markdown.getByRole('heading', { name: 'Useful options' })).toBeVisible();
  await expect(markdown.locator('strong').first()).toHaveText('Search BMS jobs:');
  await expect(markdown.locator('ul > li')).toHaveCount(3);
  await expect(markdown.getByRole('link', { name: 'BMS careers' })).toHaveAttribute('href', 'https://careers.bms.com/');
  await expect(markdown.getByRole('link', { name: 'BMS careers' })).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(markdown.locator('table')).toHaveCount(1);
  await expect(markdown.locator('pre code')).toContainText('A long code line');
  await expect(markdown.locator('a[href^="javascript:"]')).toHaveCount(0);
  await expect(markdown.locator('script')).toHaveCount(0);
  await expect(page.locator('.agent-error')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stop response' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('.agent-conversation').evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: `test-results/${testInfo.project.name}-markdown-light.png` });
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-markdown-dark.png` });
});

test('workspace and agent work without the secure-context UUID API', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => Object.defineProperty(window.crypto, 'randomUUID', { value: undefined }));
  await WorkspaceFixture.signedIn(page);
  await page.route('**/api/agent', route => {
    const input = route.request().postDataJSON();
    expect(input.threadId).toMatch(/^[a-f0-9-]{36}$/);
    expect(input.runId).toMatch(/^[a-f0-9-]{36}$/);
    return route.fulfill({ contentType: 'text/event-stream', body: WorkspaceFixture.eventStream([
      { type: 'TEXT_MESSAGE_START', messageId: 'lan-reply', role: 'assistant' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'lan-reply', delta: 'Hello from the agent.' },
      { type: 'TEXT_MESSAGE_END', messageId: 'lan-reply' },
      { type: 'RUN_FINISHED', threadId: input.threadId, runId: input.runId },
    ]) });
  });
  await WorkspaceFixture.openAgent(page);
  await page.getByRole('textbox', { name: 'Message IEEEAgent' }).fill('Hello');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByText('Hello from the agent.')).toBeVisible();
  await expect(page.locator('.agent-error')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const message of ['This site blocks agents using CAPTCHA.', 'This site requires login to access the content.']) {
  test(`browser restriction is shown: ${message}`, async ({ page }, testInfo) => {
    await WorkspaceFixture.signedIn(page);
    await page.route('**/api/agent', route => {
      const input = route.request().postDataJSON();
      return route.fulfill({ contentType: 'text/event-stream', body: WorkspaceFixture.eventStream(MafEvents.run(input,
        MafEvents.serverTool('browse-1', 'browseWebsite', { url: 'https://example.com' }, { message }),
        MafEvents.text('restriction', message))) });
    });
    await WorkspaceFixture.openAgent(page);
    await page.getByRole('textbox', { name: 'Message IEEEAgent' }).fill('Read this website.');
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    await expect(page.locator('.agent-activity summary')).toHaveText('Browsed website · example.com');
    await expect(page.locator('.agent-error')).toHaveCount(0);
    if (message.includes('CAPTCHA')) await page.screenshot({ path: `test-results/${testInfo.project.name}-captcha.png` });
  });
}


test('home keeps the center clear and the left navigation opens notes', async ({ page }) => {
  await WorkspaceFixture.signedIn(page);
  await expect(page.locator('.workspace-canvas')).toBeVisible();
  await expect(page.locator('.hero-card, .quick-cards, .notes-section')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Log out', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Go to notes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New note', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Workspace home', exact: true }).click();
  await expect(page.locator('.workspace-canvas')).toBeVisible();
  await expect(page.locator('.notes-section')).toHaveCount(0);
});
