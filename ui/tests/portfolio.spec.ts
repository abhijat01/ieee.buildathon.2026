import { test, expect } from '@playwright/test';
import { PortfolioFixture } from './PortfolioFixture';

test('empty list shows the empty state, and the AI-not-available state disables Analyze', async ({ page }) => {
  const portfolio = await PortfolioFixture.open(page, { items: [], aiAvailable: false });
  await expect(page.getByRole('heading', { name: 'Your portfolio is empty.' })).toBeVisible();
  await portfolio.expectNoOverflow();
  await portfolio.write('Some text');
  await expect(page.getByText('The AI is not available.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analyze', exact: true })).toBeDisabled();
});

test('Analyze is disabled without text, shows the AI at work, and keeps the text after an AI error', async ({ page }) => {
  const portfolio = await PortfolioFixture.open(page);
  await page.getByRole('button', { name: 'Add experience' }).click();
  await expect(page.getByRole('button', { name: 'Analyze', exact: true })).toBeDisabled();
  await page.getByLabel('Your experience').fill(PortfolioFixture.original);
  await expect(page.getByText(`${PortfolioFixture.original.length} / 4000`)).toBeVisible();
  portfolio.failAi = true;
  const release = portfolio.holdAi();
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(page.getByText('The AI reads your text')).toBeVisible();
  release();
  await expect(page.getByRole('alert')).toHaveText(PortfolioFixture.aiMessage);
  await expect(page.getByLabel('Your experience')).toHaveValue(PortfolioFixture.original);
  await page.getByRole('button', { name: 'Dismiss error' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  portfolio.failAi = false;
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Extracted information' })).toBeVisible();
});

test('no duplicate shows a note, missing fields show hints, and Edit text and Cancel work', async ({ page }) => {
  const portfolio = await PortfolioFixture.open(page, { items: [] });
  portfolio.fields = { title: 'Mentor for interns', type: 'WORK', company: null, startDate: null, endDate: null, skills: [] };
  await portfolio.analyzeNow('I was a mentor for 3 interns.');
  await expect(page.getByText('The app found no similar experience in your portfolio.')).toBeVisible();
  await expect(page.getByText('Not found. Add it if you know it.')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Work experience' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Project', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Project', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Skills').fill('Mentoring');
  await page.getByLabel('Skills').press('Enter');
  await expect(page.locator('.skill-box .chip')).toHaveText(['Mentoring']);
  await page.getByRole('button', { name: 'Remove Mentoring' }).click();
  await expect(page.locator('.skill-box .chip')).toHaveCount(0);
  await portfolio.expectNoOverflow();
  await page.getByRole('button', { name: 'Edit text' }).click();
  await expect(page.getByLabel('Your experience')).toHaveValue('I was a mentor for 3 interns.');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { name: 'Your portfolio is empty.' })).toBeVisible();
  expect(portfolio.saves).toEqual([]);
});

test('a duplicate link opens the existing entry, and Back to your draft keeps the draft', async ({ page }) => {
  const portfolio = await PortfolioFixture.open(page);
  await portfolio.analyzeNow();
  await page.getByLabel('Title').fill('Atlas for sales');
  await page.getByRole('button', { name: /Atlas reporting dashboard/ }).click();
  await expect(page.getByRole('heading', { name: 'Edit experience', level: 1 })).toBeVisible();
  await expect(page.locator('.breadcrumb')).toContainText('Atlas reporting dashboard');
  await expect(page.getByText('Your new experience is not saved yet.')).toBeVisible();
  await expect(page.getByLabel('Title')).toHaveValue('Atlas reporting dashboard');
  await expect(page.getByLabel('Company')).toHaveValue('Acme Corp');
  await expect(page.getByLabel('Start date')).toHaveValue('2022-03');
  await portfolio.expectNoOverflow();
  await page.getByRole('button', { name: 'Back to your draft' }).click();
  await expect(page.getByLabel('Title')).toHaveValue('Atlas for sales');
  await expect(page.getByRole('status', { name: 'Possible duplicates' })).toBeVisible();
  await page.getByRole('button', { name: /Sales data pipeline/ }).click();
  await page.locator('.breadcrumb').getByRole('button', { name: 'Portfolio' }).click();
  await expect(page.getByLabel('Title')).toHaveValue('Atlas for sales');
});

test('Back to your draft asks before it removes unsaved changes of the open entry', async ({ page }) => {
  const portfolio = await PortfolioFixture.open(page);
  await portfolio.analyzeNow();
  await page.getByLabel('Title').fill('Atlas for sales');
  await page.getByRole('button', { name: /Sales data pipeline/ }).click();
  await page.getByLabel('Company').fill('Acme Corporation');
  await page.getByRole('button', { name: 'Back to your draft' }).click();
  await expect(page.getByRole('dialog', { name: 'Discard your changes?' })).toContainText('You have unsaved changes.');
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByLabel('Company')).toHaveValue('Acme Corporation');
  await page.locator('.breadcrumb').getByRole('button', { name: 'Portfolio' }).click();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByLabel('Title')).toHaveValue('Atlas for sales');
  await expect(page.getByRole('status', { name: 'Possible duplicates' })).toBeVisible();
  expect(portfolio.updates).toEqual([]);
});

test('improve shows the AI at work and an error, and the member can try again, keep, accept, and restore', async ({ page }) => {
  const portfolio = await PortfolioFixture.open(page);
  await portfolio.analyzeNow();
  await page.getByRole('button', { name: 'Improve with AI' }).click();
  portfolio.failAi = true;
  const release = portfolio.holdAi();
  await page.getByRole('button', { name: 'Improve', exact: true }).click();
  await expect(page.getByText('The AI improves your text')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve & save' })).toBeDisabled();
  release();
  await expect(page.getByRole('alert')).toHaveText(PortfolioFixture.aiMessage);
  await expect(page.getByText('Your original text, unchanged')).toBeVisible();
  portfolio.failAi = false;
  await page.getByLabel('Instruction for the AI').fill('Make it shorter');
  await page.getByLabel('Instruction for the AI').press('Enter');
  await expect(page.locator('.compare-side.improved')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.compare-side.improved')).toBeVisible();
  expect(portfolio.instructions).toEqual(['', 'Make it shorter', 'Make it shorter']);
  await page.getByRole('button', { name: 'Keep original' }).click();
  await expect(page.getByLabel('Improve with AI')).toHaveCount(0);
  await expect(page.getByText('Your original text, unchanged')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve & save' })).toBeEnabled();

  await page.getByRole('button', { name: 'Improve with AI' }).click();
  await page.getByRole('button', { name: 'Close Improve with AI' }).click();
  await expect(page.getByLabel('Improve with AI')).toHaveCount(0);
  await page.getByRole('button', { name: 'Improve with AI' }).click();
  await page.getByRole('button', { name: 'Improve', exact: true }).click();
  await page.getByRole('button', { name: 'Use improved version' }).click();
  await expect(page.getByText('Improved by AI')).toBeVisible();
  await expect(page.getByLabel('Experience text')).toContainText('Led a team of 5');
  await page.getByRole('button', { name: 'Improve with AI' }).click();
  await page.getByRole('button', { name: 'Improve', exact: true }).click();
  await expect(page.locator('.compare-side').first()).toContainText('I led the build of Atlas');
  await page.getByRole('button', { name: 'Keep current text' }).click();
  await expect(page.getByText('Improved by AI')).toBeVisible();
  await expect(page.getByLabel('Experience text')).toContainText('Led a team of 5');
  await page.getByRole('button', { name: 'Restore my original text' }).click();
  await expect(page.getByText('Your original text, unchanged')).toBeVisible();
  await expect(page.getByLabel('Experience text')).toContainText('I led the build of Atlas');
  await page.getByRole('button', { name: 'Approve & save' }).click();
  await expect(page.locator('.pf-card.is-new')).toBeVisible();
  expect(portfolio.saves[0]).toMatchObject({ originalText: PortfolioFixture.original, finalText: PortfolioFixture.original });
});

test('the saved message can be dismissed, and a card opens the edit screen of the item', async ({ page }) => {
  const portfolio = await PortfolioFixture.open(page, { items: [] });
  await portfolio.analyzeNow();
  await page.getByRole('button', { name: 'Approve & save' }).click();
  await expect(page.locator('.pf-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Dismiss message' }).click();
  await expect(page.locator('.pf-card.is-new')).toHaveCount(0);
  await page.locator('.pf-card').click();
  await expect(page.getByRole('heading', { name: 'Edit experience', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Title')).toHaveValue('Atlas analytics dashboard');
  await expect(page.getByText('Your new experience is not saved yet.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'All experiences' })).toHaveCount(0);
  await page.locator('.breadcrumb').getByRole('button', { name: 'Portfolio' }).click();
  await expect(page.locator('.pf-card')).toHaveCount(1);
  await expect(page.locator('.pf-card')).toContainText('Saved today');
});

test('a server rule error shows the server message and keeps the draft', async ({ page }) => {
  const portfolio = await PortfolioFixture.open(page);
  await portfolio.analyzeNow();
  portfolio.saveError = 'The start date must not be after the end date.';
  await page.getByRole('button', { name: 'Approve & save' }).click();
  await expect(page.getByRole('alert')).toHaveText('The start date must not be after the end date.');
  await expect(page.getByLabel('Title')).toHaveValue('Atlas analytics dashboard');
});

test('the Markdown preview shows no raw HTML and no javascript link', async ({ page }) => {
  const portfolio = await PortfolioFixture.open(page);
  await portfolio.write('# Title\n\n<script>window.hacked = true</script>\n\n<img src="x" onerror="window.hacked = true">\n\n[Unsafe](javascript:alert(1)) and [Safe](https://example.com)');
  await page.getByRole('tab', { name: 'Preview' }).click();
  const preview = page.getByLabel('Markdown preview');
  await expect(preview.getByRole('heading', { name: 'Title' })).toBeVisible();
  await expect(preview.locator('script, img')).toHaveCount(0);
  await expect(preview.locator('a[href^="javascript:"]')).toHaveCount(0);
  await expect(preview.getByRole('link', { name: 'Safe', exact: true })).toHaveAttribute('rel', 'noopener noreferrer');
  expect(await page.evaluate(() => (window as unknown as { hacked?: boolean }).hacked)).toBeUndefined();
});

test('the portfolio works in the dark theme', async ({ page }, testInfo) => {
  const portfolio = await PortfolioFixture.open(page);
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await portfolio.analyzeNow();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await portfolio.expectNoOverflow();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-portfolio-dark.png`, fullPage: true });
});

test('a late AI answer for a cancelled draft does not change a new draft', async ({ page }) => {
  const portfolio = await PortfolioFixture.open(page);
  await portfolio.write('The first text.');
  const release = portfolio.holdAi();
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await page.locator('.breadcrumb').getByRole('button', { name: 'Portfolio' }).click();
  await portfolio.write('The second text.');
  release();
  await page.waitForTimeout(300);
  await expect(page.getByLabel('Your experience')).toHaveValue('The second text.');
  await expect(page.getByRole('heading', { name: 'Extracted information' })).toHaveCount(0);
});

test('the review controls are off while the AI improves the text', async ({ page }) => {
  const portfolio = await PortfolioFixture.open(page);
  await portfolio.analyzeNow();
  await page.getByRole('button', { name: 'Improve with AI' }).click();
  const release = portfolio.holdAi();
  await page.getByRole('button', { name: 'Improve', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit text' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Improve', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Approve & save' })).toBeDisabled();
  release();
  await expect(page.getByRole('button', { name: 'Use improved version' })).toBeVisible();
});
