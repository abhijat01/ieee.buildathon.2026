import { test, expect } from '@playwright/test';
import { ResumeFixture } from './ResumeFixture';

test('the include switch changes the tag, and Write resume is off without an included item', async ({ page }) => {
  const resume = await ResumeFixture.open(page);
  await resume.analyzeNow();
  const fabrikam = page.locator('.rs-item').filter({ hasText: 'Fabrikam Retail' });
  const student = page.locator('.rs-item').filter({ hasText: 'Student branch website' });
  await expect(fabrikam.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await fabrikam.getByRole('switch').click();
  await expect(fabrikam.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  await expect(fabrikam).toContainText('Changed by you');
  await student.getByRole('switch', { name: 'Include Student branch website' }).click();
  await expect(student).toContainText('Changed by you');
  await expect(page.getByText('4 of 5 included')).toBeVisible();
  await fabrikam.getByRole('switch').click();
  await expect(fabrikam).toContainText('Proposed by AI');
  await fabrikam.getByRole('switch').click();

  await resume.writeNow();
  expect(resume.writes[0].itemIds).toEqual(['p1', 'p2', 'w1', 'p3']);
  const preview = page.getByLabel('Resume preview');
  await expect(preview).toContainText('Student branch website | IEEE Student Branch');
  await expect(preview).not.toContainText('Fabrikam Retail');
  const ats = page.getByRole('region', { name: 'ATS check' });
  await expect(ats).toContainText('9 of 13');
  await expect(ats).toContainText('IN ITEMS THAT YOU EXCLUDED');
  await expect(ats).toContainText('Include the item to add these keywords.');
  await expect(page.locator('.improved-toggle')).toHaveCount(4);

  await page.getByRole('button', { name: 'Change the selection' }).click();
  await expect(fabrikam).toContainText('Changed by you');
  const included = page.getByRole('switch', { checked: true });
  while (await included.count()) await included.first().click();
  await expect(page.getByText('0 of 5 included')).toBeVisible();
  await expect(page.getByText('Include one item or more.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Write resume' })).toBeDisabled();
});

test('the two tabs show the same resume, and the copy state returns to Copy Markdown', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const resume = await ResumeFixture.open(page);
  await resume.analyzeNow();
  await resume.writeNow();
  await expect(page.getByRole('tab', { name: 'Preview' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Resume Markdown')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Markdown' }).click();
  await expect(page.getByLabel('Resume Markdown')).toContainText('## Work Experience');
  await expect(page.getByLabel('Resume preview')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Preview' }).click();
  await expect(page.getByLabel('Resume preview').getByRole('heading', { name: 'Work Experience' })).toBeVisible();
  await page.getByRole('button', { name: 'Copy Markdown' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy Markdown' })).toBeVisible({ timeout: 5000 });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .md' }).click();
  expect((await download).suggestedFilename()).toBe('resume-abhijat.md');

  await page.getByRole('button', { name: 'Start a new resume' }).click();
  await expect(page.getByLabel('Job description')).toHaveValue('');
  await expect(page.getByText('0 / 8000')).toBeVisible();
});

test('an empty portfolio shows the empty state, and Open Portfolio opens the portfolio', async ({ page }) => {
  const resume = await ResumeFixture.open(page, { empty: true });
  await expect(page.getByRole('heading', { name: 'Your portfolio is empty.' })).toBeVisible();
  await expect(page.getByText('The AI builds a resume from your portfolio items. Add an experience first.')).toBeVisible();
  await expect(page.getByLabel('Job description')).toHaveCount(0);
  await resume.expectNoOverflow();
  await page.getByRole('button', { name: 'Open Portfolio' }).click();
  await expect(page.getByRole('heading', { name: 'Portfolio', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Portfolio', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('the state without AI shows the info note, and Analyze is off', async ({ page }) => {
  await ResumeFixture.open(page, { aiAvailable: false });
  await expect(page.getByText('The AI is not available.')).toBeVisible();
  await page.getByLabel('Job description').fill(ResumeFixture.jobText);
  await expect(page.getByRole('button', { name: 'Analyze', exact: true })).toBeDisabled();
});

test('an AI error shows the server message and keeps the job text and the selection', async ({ page }) => {
  const resume = await ResumeFixture.open(page);
  await page.getByLabel('Job description').fill(ResumeFixture.jobText);
  await expect(page.getByText(`${ResumeFixture.jobText.length} / 8000`)).toBeVisible();
  resume.failAi = true;
  let release = resume.holdAi();
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(page.getByText('The AI reads the job description and reviews your 5 portfolio items…')).toBeVisible();
  release();
  await expect(page.getByRole('alert')).toHaveText(ResumeFixture.analyzeMessage);
  await expect(page.getByLabel('Job description')).toHaveValue(ResumeFixture.jobText);
  await page.getByRole('button', { name: 'Dismiss error' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);

  resume.failAi = false;
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What the job needs' })).toBeVisible();
  await page.getByRole('switch', { name: 'Include Software Engineer', exact: true }).click();
  resume.failAi = true;
  release = resume.holdAi();
  await page.getByRole('button', { name: 'Write resume' }).click();
  await expect(page.getByText('The AI improves the descriptions and writes your resume…')).toBeVisible();
  release();
  await expect(page.getByRole('alert')).toHaveText(ResumeFixture.writeMessage);
  await expect(page.getByRole('switch', { name: 'Include Software Engineer', exact: true })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByText('3 of 5 included')).toBeVisible();
  await page.getByRole('button', { name: 'Change the job description' }).click();
  await expect(page.getByLabel('Job description')).toHaveValue(ResumeFixture.jobText);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('the flow works at a width of 390 px and in the dark theme', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const resume = await ResumeFixture.open(page);
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await resume.expectNoOverflow();
  await resume.analyzeNow();
  await resume.expectNoOverflow();
  await resume.writeNow();
  await page.getByRole('button', { name: /Sales data pipeline/ }).click();
  await expect(page.locator('.compare-side.improved')).toContainText('Integrated 40 source tables');
  await page.getByRole('tab', { name: 'Markdown' }).click();
  await resume.expectNoOverflow();
  const box = await page.getByRole('button', { name: 'Download .md' }).boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390).toBe(true);
});
