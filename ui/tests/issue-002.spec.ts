import { test, expect } from '@playwright/test';
import { AssistantFixture } from './AssistantFixture';
import { EditExperiencePage } from './EditExperiencePage';

const FACT = 'The sales team of 40 people used it each day.';
const TEXT_WITH_FACT = `${EditExperiencePage.improvedText}\n\n**Result:** ${FACT}`;

test('member changes an item with the assistant: edit, proposals, accept, reject, answer, and save', async ({ page }, testInfo) => {
  const edit = await EditExperiencePage.open(page, testInfo.project.name);
  const { assistant, portfolio } = edit;

  // The start state: the form has the saved values, and the assistant knows the open item.
  await expect(edit.saveButton()).toBeDisabled();
  await expect(edit.discardButton()).toBeDisabled();
  await expect(page.getByText('Saved Sep 12')).toBeVisible();
  await edit.openAssistant();
  await expect(edit.pane.getByRole('heading', { name: 'How can I help with this experience?' })).toBeVisible();
  await expect(edit.pane.locator('.intro-actions button')).toHaveText(
    ['Improve the text', 'Suggest skills', 'Update the fields', 'Ask me for missing facts', 'Write resume bullets']);
  await expect(edit.pane.getByText('Works on: Atlas reporting dashboard', { exact: true })).toBeVisible();
  await expect(edit.pane.getByText('The assistant cannot save. Only you save the changes.')).toBeVisible();
  await edit.closeAssistant();

  // Step 2: a change makes Save changes available.
  await page.getByLabel('Company').fill('Acme Corporation');
  await expect(edit.saveButton()).toBeEnabled();
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible();

  // Steps 3 and 4: the assistant proposes a text. The member compares and accepts it.
  assistant.reply(EditExperiencePage.improve);
  const release = assistant.hold();
  await edit.openAssistant();
  await expect(edit.pane.getByText('Works on: Atlas reporting dashboard · sees your unsaved changes')).toBeVisible();
  await edit.pane.getByRole('button', { name: 'Improve the text' }).click();
  await expect(edit.pane.getByText('The assistant reads your experience…')).toBeVisible();
  await expect(edit.pane.getByRole('group', { name: 'Quick actions' }).getByRole('button', { name: 'Suggest skills' })).toBeDisabled();
  await expect(edit.pane.locator('.msg.user')).toHaveText('YouImprove the text.');
  if (testInfo.project.name === 'mobile') {
    await edit.closeAssistant();
    await expect(page.getByRole('status', { name: 'The assistant works' })).toBeVisible();
  }
  release();
  await edit.openAssistant();
  await expect(edit.pane.getByText('I made the text more active. I kept each fact and added none.')).toBeVisible();
  await edit.pane.getByRole('button', { name: 'Show in the form' }).click();
  const proposal = page.locator('.proposal-block');
  await expect(proposal).toBeInViewport();
  await expect(proposal).toContainText('Proposal from the assistant · Improved text');
  await expect(proposal).toContainText('More active verbs. The facts are the same.');
  await expect(proposal.locator('.compare-side').first()).toContainText('CURRENT');
  await expect(proposal.locator('.compare-side').first()).toContainText('I built the first version');
  await expect(proposal.locator('.compare-side.improved')).toContainText('PROPOSED');
  await expect(proposal.locator('.compare-side.improved')).toContainText('Built the data pipeline with Python');
  await expect(page.getByText('1 proposal to review')).toBeVisible();
  await expect(edit.editor).toHaveValue(EditExperiencePage.text);
  expect(assistant.requests[0].state).toMatchObject({ itemId: 'a1', company: 'Acme Corporation', unsavedChanges: true, text: EditExperiencePage.text });
  expect(assistant.requests[1].messages).toEqual([expect.objectContaining({ role: 'tool', toolCallId: 'call-1' })]);
  await proposal.getByRole('button', { name: 'Accept' }).click();
  await expect(edit.editor).toHaveValue(EditExperiencePage.improvedText);
  await expect(proposal).toHaveCount(0);
  await edit.expectActivity('You accepted the new text');

  // Step 5: the member accepts one skill and rejects one skill.
  assistant.reply(EditExperiencePage.skills);
  await edit.quick('Suggest skills');
  await expect(page.locator('.chip.proposed')).toHaveText(['+ Kubernetes', '+ Docker']);
  await expect(page.getByText('2 proposals to review')).toBeVisible();
  await page.getByRole('button', { name: 'Accept Kubernetes' }).click();
  await page.getByRole('button', { name: 'Reject Docker' }).click();
  await expect(edit.skillChips()).toHaveText(['Python', 'React', 'PostgreSQL', 'Kubernetes']);
  await expect(page.locator('.chip.proposed')).toHaveCount(0);
  await edit.expectActivity('You reviewed the skills');

  // Step 6: the assistant asks for a fact and uses the answer in the next proposal.
  assistant.reply({ text: 'A result can make this experience stronger. How many people used your work? I use only what you tell me.' },
    { text: 'Thank you. I added your answer as a result line.', tool: { name: 'proposeText', args: { text: TEXT_WITH_FACT, label: 'Text with your result', reason: 'One new line with the fact that you gave.' } } });
  await edit.quick('Ask me for missing facts');
  await edit.openAssistant();
  await expect(edit.pane.getByLabel('Message to the assistant')).toHaveAttribute('placeholder', 'Type your answer…');
  await edit.say(FACT);
  const answerRun = assistant.memberRuns()[3];
  expect(answerRun.messages).toEqual([expect.objectContaining({ role: 'user', content: FACT })]);
  expect(answerRun.state.decisions).toEqual([{ proposal: 'Text: Improved text', outcome: 'accepted' },
    { proposal: 'Skill: Kubernetes', outcome: 'accepted' }, { proposal: 'Skill: Docker', outcome: 'rejected' }]);
  expect(new Set(assistant.requests.map(request => request.threadId)).size).toBe(1);
  await expect(page.locator('.proposal-block .compare-side.improved')).toContainText(FACT);

  // Step 7: the app stores the changes only at Save changes.
  expect(portfolio.updates).toEqual([]);
  await page.locator('.proposal-block').getByRole('button', { name: 'Accept' }).click();
  await edit.saveButton().click();
  await expect(page.getByRole('status').filter({ hasText: 'The app saved your changes.' })).toBeVisible();
  await expect(edit.saveButton()).toBeDisabled();
  await expect(page.getByText('Unsaved changes', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Saved today')).toBeVisible();
  expect(portfolio.updates).toEqual([{ id: 'a1', type: 'PROJECT', title: 'Atlas reporting dashboard', company: 'Acme Corporation',
    startDate: '2022-03', endDate: '2023-03', skills: ['Python', 'React', 'PostgreSQL', 'Kubernetes'], finalText: TEXT_WITH_FACT }]);
  await edit.openAssistant();
  await expect(edit.pane.locator('.msg.user')).toHaveCount(4);
  await edit.closeAssistant();
  await edit.portfolio.expectNoOverflow();

  // Step 8: the list and the item show the saved changes.
  await page.locator('.breadcrumb').getByRole('button', { name: 'Portfolio' }).click();
  const card = page.locator('.pf-card', { hasText: 'Atlas reporting dashboard' });
  await expect(card).toContainText('Acme Corporation');
  await expect(card).toContainText('Saved today');
  await edit.openItem();
  await expect(page.getByLabel('Company')).toHaveValue('Acme Corporation');
  await expect(edit.skillChips()).toHaveText(['Python', 'React', 'PostgreSQL', 'Kubernetes']);
  await expect(edit.editor).toHaveValue(TEXT_WITH_FACT);
  await edit.openAssistant();
  await expect(edit.pane.getByRole('heading', { name: 'How can I help with this experience?' })).toBeVisible();
});

test('the edit screen shows the proposals as in the mockup', async ({ page }, testInfo) => {
  const edit = await EditExperiencePage.open(page, testInfo.project.name);
  edit.assistant.reply(EditExperiencePage.skills, EditExperiencePage.fields, EditExperiencePage.improve);
  await edit.quick('Suggest skills');
  await edit.quick('Update the fields');
  await edit.quick('Improve the text');
  await expect(page.getByText('4 proposals to review')).toBeVisible();
  await expect(page.locator('.field-proposal')).toContainText('The assistant proposes 2023-06. The text says: “until the middle of 2023”.');
  await expect(page.locator('.chip.proposed')).toHaveCount(2);
  await expect(page.locator('.proposal-block')).toBeVisible();
  await edit.portfolio.expectNoOverflow();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  // The screenshot shows the same state as the mockup previews: four open proposals.
  await page.screenshot({ path: `../agent-ws/git-002/impl-${testInfo.project.name}.png`, fullPage: true });
});

test('a rejected proposal changes nothing, and a newer text proposal replaces the old proposal', async ({ page }, testInfo) => {
  const edit = await EditExperiencePage.open(page, testInfo.project.name);
  edit.assistant.reply(EditExperiencePage.improve, EditExperiencePage.fields, EditExperiencePage.skills);

  await edit.quick('Improve the text');
  await page.locator('.proposal-block').getByRole('button', { name: 'Reject' }).click();
  await expect(page.locator('.proposal-block')).toHaveCount(0);
  await expect(edit.editor).toHaveValue(EditExperiencePage.text);
  await edit.expectActivity('You rejected the new text');

  await edit.quick('Update the fields');
  await page.locator('.field-proposal').getByRole('button', { name: 'Reject' }).click();
  await expect(page.locator('.field-proposal')).toHaveCount(0);
  await expect(page.getByLabel('End date')).toHaveValue('2023-03');
  await edit.expectActivity('You reviewed the field changes');

  await edit.quick('Suggest skills');
  await page.getByRole('button', { name: 'Reject Kubernetes' }).click();
  await page.getByRole('button', { name: 'Reject Docker' }).click();
  await expect(edit.skillChips()).toHaveText(['Python', 'React', 'PostgreSQL']);
  await edit.expectActivity('You reviewed the skills');
  await expect(edit.saveButton()).toBeDisabled();
  await expect(page.getByText('to review')).toHaveCount(0);

  // The Preview tab shows the same text as the Write tab.
  await page.getByRole('tab', { name: 'Preview' }).click();
  await expect(page.getByLabel('Markdown preview').getByRole('heading', { name: 'Atlas reporting dashboard' })).toBeVisible();
  await expect(page.getByLabel('Markdown preview').locator('li')).toHaveCount(3);

  // A new text proposal opens the Write tab. Only the last text proposal shows.
  const shorter = { text: 'I made the text shorter.', tool: { name: 'proposeText', args: { text: '## Atlas\n\nA short text.', label: 'Shorter text', reason: 'Fewer words.' } } };
  edit.assistant.reply(EditExperiencePage.improve, shorter);
  await edit.quick('Improve the text');
  await expect(page.getByRole('tab', { name: 'Write' })).toHaveAttribute('aria-selected', 'true');
  await expect(edit.editor).toHaveValue(EditExperiencePage.text);
  await edit.say('Make it shorter.');
  await expect(page.locator('.proposal-block')).toHaveCount(1);
  await expect(page.locator('.proposal-block')).toContainText('Shorter text');
  await expect(page.getByText('1 proposal to review')).toBeVisible();
  await edit.expectActivity('Replaced by a newer proposal');
  await edit.expectActivity('Proposed a new text');
  expect(edit.portfolio.updates).toEqual([]);
});

test('accept all skills and accept a field change, and a rule error of the server keeps the form', async ({ page }, testInfo) => {
  const edit = await EditExperiencePage.open(page, testInfo.project.name);
  edit.assistant.reply(EditExperiencePage.skills, EditExperiencePage.fields);
  await edit.quick('Suggest skills');
  await page.getByRole('button', { name: 'Accept all' }).click();
  await expect(edit.skillChips()).toHaveText(['Python', 'React', 'PostgreSQL', 'Kubernetes', 'Docker']);
  await edit.quick('Update the fields');
  await page.locator('.field-proposal').getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByLabel('End date')).toHaveValue('2023-06');
  edit.portfolio.updateError = 'The start date must not be after the end date.';
  await edit.saveButton().click();
  await expect(page.getByRole('alert')).toContainText('The start date must not be after the end date.');
  await expect(page.getByLabel('End date')).toHaveValue('2023-06');
  await expect(edit.saveButton()).toBeEnabled();
  edit.portfolio.updateError = null;
  await edit.saveButton().click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(edit.portfolio.updates).toHaveLength(1);
  expect(edit.portfolio.updates[0]).toMatchObject({ endDate: '2023-06', skills: ['Python', 'React', 'PostgreSQL', 'Kubernetes', 'Docker'] });
});

test('Discard restores the saved item, and the app asks before the breadcrumb or the rail removes changes', async ({ page }, testInfo) => {
  const edit = await EditExperiencePage.open(page, testInfo.project.name);
  edit.assistant.reply(EditExperiencePage.improve);
  await edit.quick('Improve the text');
  await page.getByLabel('Title').fill('Atlas for the sales team');

  await edit.discardButton().click();
  await expect(edit.dialog()).toContainText('The app restores the saved version of this experience.');
  await expect(page.getByRole('button', { name: 'Keep editing' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(edit.dialog()).toHaveCount(0);
  await edit.discardButton().click();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByLabel('Title')).toHaveValue('Atlas for the sales team');
  await expect(page.locator('.proposal-block')).toBeVisible();

  await edit.discardButton().click();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByLabel('Title')).toHaveValue('Atlas reporting dashboard');
  await expect(page.locator('.proposal-block')).toHaveCount(0);
  await expect(edit.saveButton()).toBeDisabled();
  await edit.openAssistant();
  await expect(edit.pane.getByRole('heading', { name: 'How can I help with this experience?' })).toBeVisible();
  await expect(edit.pane.locator('.msg')).toHaveCount(0);
  edit.assistant.reply({ text: 'The text is already clear.' });
  await edit.quick('Improve the text');
  expect(edit.assistant.requests.at(-1)?.threadId).not.toBe(edit.assistant.requests[0].threadId);

  // The leave guard: the breadcrumb and a rail button.
  await page.getByLabel('Company').fill('Acme Corporation');
  await page.locator('.breadcrumb').getByRole('button', { name: 'Portfolio' }).click();
  await expect(edit.dialog()).toContainText('You have unsaved changes. If you leave this page, the app does not keep them.');
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByLabel('Company')).toHaveValue('Acme Corporation');
  await page.getByRole('button', { name: 'Go to notes' }).click();
  await expect(edit.dialog()).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByRole('heading', { name: 'Edit experience', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Go to notes' }).click();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByRole('heading', { name: 'Notes', level: 1 })).toBeVisible();
  expect(edit.portfolio.updates).toEqual([]);

  // Without unsaved changes, the app does not ask.
  await page.getByRole('button', { name: 'Portfolio', exact: true }).click();
  await edit.openItem();
  await expect(page.getByLabel('Company')).toHaveValue('Acme Corp');
  await page.getByRole('button', { name: 'Go to notes' }).click();
  await expect(page.getByRole('heading', { name: 'Notes', level: 1 })).toBeVisible();
});

test('the browser asks before a reload removes unsaved changes', async ({ page }, testInfo) => {
  const edit = await EditExperiencePage.open(page, testInfo.project.name);
  await page.getByLabel('Company').fill('Acme Corporation');
  const asked = page.waitForEvent('dialog');
  await page.evaluate(() => { window.setTimeout(() => window.location.reload(), 0); });
  const dialog = await asked;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  await expect(page.getByLabel('Company')).toHaveValue('Acme Corporation');
  await expect(edit.saveButton()).toBeEnabled();
});

test('without the assistant, the member sees a clear message and can still edit and save', async ({ page }, testInfo) => {
  const edit = await EditExperiencePage.open(page, testInfo.project.name, { aiAvailable: false });
  await edit.openAssistant();
  await expect(edit.pane.getByRole('status')).toHaveText('The assistant is not available at this time. You can still change and save the experience.');
  await expect(edit.pane.locator('.intro-actions')).toHaveCount(0);
  await expect(edit.pane.getByLabel('Message to the assistant')).toBeDisabled();
  await expect(edit.pane.getByLabel('Message to the assistant')).toHaveAttribute('placeholder', 'The assistant is not available');
  await expect(edit.pane.getByRole('button', { name: 'Send message' })).toBeDisabled();
  await edit.closeAssistant();
  await page.getByLabel('Company').fill('Acme Corporation');
  await page.getByLabel('Skills').fill('Docker');
  await page.getByLabel('Skills').press('Enter');
  await page.getByRole('button', { name: 'Remove React' }).click();
  await page.getByRole('button', { name: 'Work experience' }).click();
  await edit.saveButton().click();
  await expect(page.getByRole('status').filter({ hasText: 'The app saved your changes.' })).toBeVisible();
  expect(edit.portfolio.updates[0]).toMatchObject({ id: 'a1', company: 'Acme Corporation', type: 'WORK', skills: ['Python', 'PostgreSQL', 'Docker'] });
  expect(edit.assistant.requests).toEqual([]);
  await page.getByRole('button', { name: 'Dismiss message' }).click();
  await expect(page.getByText('The app saved your changes.')).toHaveCount(0);
});

test('a failed answer shows an error with Try again, and the form keeps its values', async ({ page }, testInfo) => {
  const edit = await EditExperiencePage.open(page, testInfo.project.name);
  const { assistant } = edit;
  await page.getByLabel('Company').fill('Acme Corporation');

  // A failed first run: Try again sends the same member message, not a second copy.
  assistant.reply({ error: AssistantFixture.failure }, EditExperiencePage.improve);
  await edit.quick('Improve the text');
  await edit.openAssistant();
  await expect(edit.pane.getByRole('alert')).toContainText('The assistant could not answer. Your changes are safe.');
  await expect(page.getByLabel('Company')).toHaveValue('Acme Corporation');
  await expect(edit.editor).toHaveValue(EditExperiencePage.text);
  assistant.resultReplies.push({ error: AssistantFixture.failure });
  await edit.pane.getByRole('button', { name: 'Try again' }).click();
  await expect(edit.pane.getByRole('alert')).toBeVisible();
  await expect(edit.pane.locator('.msg.user')).toHaveCount(1);
  expect(assistant.requests[1].messages).toEqual(assistant.requests[0].messages);

  // A failed tool result run: the proposal shows, and Try again sends the tool results again.
  await expect(edit.pane.getByText('I made the text more active.')).toHaveCount(1);
  await expect(page.locator('.proposal-block')).toHaveCount(1);
  assistant.resultReplies.push({ text: 'Tell me what you think.' });
  await edit.pane.getByRole('button', { name: 'Try again' }).click();
  await expect(edit.pane.getByText('Tell me what you think.')).toBeVisible();
  await expect(edit.pane.getByRole('alert')).toHaveCount(0);
  expect(assistant.requests).toHaveLength(4);
  expect(assistant.requests[3].messages).toEqual(assistant.requests[2].messages);
  expect(assistant.requests[3].messages[0]).toMatchObject({ role: 'tool', toolCallId: 'call-1' });
  await expect(edit.pane.locator('.msg.user')).toHaveCount(1);
  await expect(page.locator('.proposal-block')).toHaveCount(1);
  await expect(page.getByLabel('Company')).toHaveValue('Acme Corporation');
});

test('the edit screen works in the dark theme', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const edit = await EditExperiencePage.open(page, testInfo.project.name);
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  edit.assistant.reply(EditExperiencePage.skills, EditExperiencePage.fields, EditExperiencePage.improve);
  await edit.quick('Suggest skills');
  await edit.quick('Update the fields');
  await edit.quick('Improve the text');
  await page.getByLabel('Title').fill('Atlas dashboard');
  await expect(page.getByText('4 proposals to review')).toBeVisible();
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible();
  await edit.portfolio.expectNoOverflow();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-edit-dark.png`, fullPage: true });
  await edit.openAssistant();
  await expect(edit.pane.locator('.msg.user')).toHaveCount(3);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-edit-dark-assistant.png` });
});
