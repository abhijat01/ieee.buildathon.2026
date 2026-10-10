import { test, expect } from '@playwright/test';
import { PortfolioFixture } from './PortfolioFixture';

test('member adds an experience with AI help: write, preview, analyze, improve, approve, and save', async ({ page }, testInfo) => {
  const portfolio = await PortfolioFixture.open(page);
  await expect(page.locator('.pf-card')).toHaveCount(3);

  await portfolio.write();
  await page.getByRole('tab', { name: 'Preview' }).click();
  const preview = page.getByLabel('Markdown preview');
  await expect(preview.getByRole('heading', { name: 'Atlas analytics dashboard' })).toBeVisible();
  await expect(preview.locator('li')).toHaveCount(3);
  await expect(preview.locator('strong')).toHaveText('Acme Corp');

  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(page.getByLabel('Title')).toHaveValue('Atlas analytics dashboard');
  await expect(page.getByRole('button', { name: 'Project', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Company')).toHaveValue('Acme Corp');
  await expect(page.getByLabel('Start date')).toHaveValue('2022-03');
  await expect(page.getByLabel('End date')).toHaveValue('2023-06');
  await expect(page.locator('.skill-box .chip')).toHaveCount(5);
  await expect(page.getByText('Your original text, unchanged')).toBeVisible();
  expect(portfolio.analyzed).toEqual([PortfolioFixture.original]);

  const warning = page.getByRole('status', { name: 'Possible duplicates' });
  await expect(warning).toContainText('2 similar experiences');
  await expect(warning.getByRole('button', { name: /Atlas reporting dashboard/ })).toContainText('Very similar');
  await expect(warning.getByRole('button', { name: /Sales data pipeline/ })).toContainText('Some overlap');

  await page.getByLabel('Company').fill('Acme Corporation');
  await page.getByRole('button', { name: 'Improve with AI' }).click();
  await page.getByRole('button', { name: 'Make the results measurable' }).click();
  await page.getByRole('button', { name: 'Improve', exact: true }).click();
  await expect(page.getByText('ORIGINAL', { exact: true })).toBeVisible();
  await expect(page.locator('.compare-side.improved')).toContainText('Led a team of 5');
  await expect(page.getByText(PortfolioFixture.note)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve & save' })).toBeDisabled();
  expect(portfolio.instructions).toEqual(['Make the results measurable']);
  await portfolio.expectNoOverflow();
  await page.getByLabel('Company').fill('Acme Corp');
  await page.getByLabel('Company').blur();
  await page.mouse.move(0, 0);
  // The screenshot shows the same state as the mockup previews: the side-by-side comparison.
  await page.screenshot({ path: `../agent-ws/git-001/impl-${testInfo.project.name}.png`, fullPage: true });
  await page.getByLabel('Company').fill('Acme Corporation');

  await page.getByRole('button', { name: 'Use improved version' }).click();
  await expect(page.getByText('Improved by AI')).toBeVisible();
  expect(portfolio.saves).toEqual([]);
  await page.getByRole('button', { name: 'Approve & save' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'The app saved the experience' })).toBeVisible();
  await expect(page.locator('.pf-card')).toHaveCount(4);
  await expect(page.locator('.pf-card.is-new')).toContainText('Atlas analytics dashboard');
  await expect(page.locator('.pf-card.is-new')).toContainText('New');
  expect(portfolio.saves).toEqual([{ ...PortfolioFixture.fields, company: 'Acme Corporation',
    originalText: PortfolioFixture.original, finalText: PortfolioFixture.improved }]);
  await portfolio.expectNoOverflow();
});
