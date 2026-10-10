import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { ResumeFixture } from './ResumeFixture';

test('issue #3: a member builds a resume for a job description with AI help', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const resume = await ResumeFixture.open(page);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Paste a job description. The AI builds a resume from your portfolio.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analyze', exact: true })).toBeDisabled();

  await resume.analyzeNow();
  expect(resume.analyzed).toEqual([ResumeFixture.jobText]);
  const needs = page.getByRole('region', { name: 'What the job needs' });
  await expect(needs).toContainText('Senior Full-Stack Engineer, Data Products');
  await expect(needs).toContainText('Run services on Kubernetes in AWS');
  await expect(needs.locator('.chip')).toHaveCount(13);
  const rows = page.locator('.rs-item');
  await expect(rows).toHaveCount(5);
  await expect(rows.first()).toContainText('High relevance');
  await expect(rows.first()).toContainText('Shows team lead work.');
  await expect(rows.first()).toContainText('Proposed by AI');
  await expect(rows.last()).toContainText('Low relevance');
  await expect(rows.last()).toContainText('Not proposed by AI');
  await expect(page.getByText('4 of 5 included')).toBeVisible();
  await resume.expectNoOverflow();

  await resume.writeNow();
  expect(resume.writes).toEqual([{ jobText: ResumeFixture.jobText, keywords: ResumeFixture.keywords, itemIds: ['p1', 'p2', 'w1', 'w2'] }]);
  const preview = page.getByLabel('Resume preview');
  await expect(preview.getByRole('heading', { level: 1, name: 'Abhijat' })).toBeVisible();
  await expect(preview.getByRole('heading', { level: 2 })).toHaveText(['Summary', 'Skills', 'Work Experience', 'Projects']);
  await expect(preview).toContainText('Atlas analytics dashboard | Acme Corp');
  await expect(preview).not.toContainText('Student branch website');
  const ats = page.getByRole('region', { name: 'ATS check' });
  await expect(ats).toContainText('10 of 13');
  await expect(ats).toContainText('NOT IN YOUR PORTFOLIO');
  await expect(ats.locator('.chip.warn')).toHaveText(['AWS', 'Snowflake', 'dbt']);
  await expect(ats).not.toContainText('IN ITEMS THAT YOU EXCLUDED');
  await expect(ats.locator('.ats-list li')).toHaveCount(4);

  const atlas = page.getByRole('button', { name: /Atlas analytics dashboard/ });
  await expect(atlas).toHaveAttribute('aria-expanded', 'false');
  await atlas.click();
  await expect(atlas).toHaveAttribute('aria-expanded', 'true');
  const compare = page.locator('.improved-list .compare');
  await expect(compare.locator('.compare-side').first()).toContainText('Worked with 4 engineers and 1 designer');
  await expect(compare.locator('.compare-side.improved')).toContainText('Led 4 engineers and 1 designer');
  await resume.expectNoOverflow();
  await page.mouse.move(0, 0);
  await expect(page.locator('.improved-toggle[aria-expanded=true] svg')).toHaveCSS('transform', 'matrix(-1, 0, 0, -1, 0, 0)');
  // The screenshot shows the same state as the mockup previews: the resume with one open comparison.
  await page.screenshot({ path: `../agent-ws/git-003/impl-${testInfo.project.name}.png`, fullPage: true });

  await page.getByRole('tab', { name: 'Markdown' }).click();
  await expect(page.getByRole('tab', { name: 'Markdown' })).toHaveAttribute('aria-selected', 'true');
  const markdown = ResumeFixture.markdown(['p1', 'p2', 'w1', 'w2']);
  await expect(page.getByLabel('Resume Markdown')).toHaveText(markdown);
  await page.getByRole('button', { name: 'Copy Markdown' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(markdown);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .md' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('resume-abhijat.md');
  expect(await readFile(await file.path(), 'utf8')).toBe(markdown);
  await resume.expectNoOverflow();
});
