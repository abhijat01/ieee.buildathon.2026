import { test, expect, type Page } from '@playwright/test';
class ExperienceFixture {
  static fields = { company: 'Acme', projectName: 'Atlas', startDate: '2022-03', endDate: null, description: 'Built a dashboard.' };
  static async open(page: Page) {
    await page.route('**/api/session', route => route.fulfill({ json: { name: 'Member', email: null, csrfToken: 'csrf', csrfHeader: 'X-CSRF-TOKEN', agentAvailable: false } }));
    await page.route('**/api/notes', route => route.fulfill({ json: [] }));
    await page.goto('/'); await page.getByRole('button', { name: 'Resume Builder', exact: true }).click();
  }
  static async analyze(page: Page) {
    await page.getByLabel('Your experience', { exact: true }).fill('At Acme, I built Atlas from March 2022.');
    await page.getByRole('button', { name: 'Analyze', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Review your/ })).toBeVisible();
  }
}
for (const type of ['Project', 'Professional experience']) {
  test(`${type}: review edits, cancel, then explicit save`, async ({ page }, info) => {
    let saves = 0;
    await page.route('**/api/experiences/analyze', route => route.fulfill({ json: ExperienceFixture.fields }));
    await page.route('**/api/experiences', async route => {
      saves++; const payload = route.request().postDataJSON();
      expect(payload).toMatchObject({ type: type === 'Project' ? 'PROJECT' : 'PROFESSIONAL', company: 'Edited company', projectName: 'Edited project', startDate: '2021', endDate: '2023-06', description: 'Edited description.', originalInput: 'At Acme, I built Atlas from March 2022.' });
      expect(route.request().headers()['x-csrf-token']).toBe('csrf');
      await route.fulfill({ json: { id: 'saved', ...payload } });
    });
    await ExperienceFixture.open(page);
    await page.getByLabel('Experience type').selectOption({ label: type });
    await ExperienceFixture.analyze(page);
    await expect(page.locator('.missing-value')).toHaveText(['Missing']);
    expect(saves).toBe(0);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByLabel('Your experience', { exact: true })).toHaveValue('At Acme, I built Atlas from March 2022.'); expect(saves).toBe(0);
    await page.getByRole('button', { name: 'Analyze', exact: true }).click();
    await page.getByLabel('Company', { exact: true }).fill('Edited company');
    await page.getByLabel('Project name', { exact: true }).fill('Edited project');
    await page.getByLabel('Start date', { exact: true }).fill('2021');
    await page.getByLabel('End date', { exact: false }).fill('2023-06');
    await page.getByLabel('Description', { exact: true }).fill('Edited description.');
    await page.getByRole('button', { name: 'Light theme', exact: true }).click();
    await page.screenshot({ path: `test-results/${info.project.name}-${type}-light-preview.png`, fullPage: true });
    await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/${info.project.name}-${type}-preview.png`, fullPage: true });
    await page.getByRole('button', { name: 'Accept & Save', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Experience saved.'); expect(saves).toBe(1);
  });
}
test('analysis and save failures retain values and support retry', async ({ page }) => {
  let analysis = 0, saves = 0;
  await page.route('**/api/experiences/analyze', async route => {
    analysis++; await route.fulfill(analysis === 1 ? { status: 502, json: { message: 'Analysis failed.' } } : { json: ExperienceFixture.fields });
  });
  await page.route('**/api/experiences', async route => {
    saves++;
    await route.fulfill(saves === 1 ? { status: 400, json: { message: 'Check the fields.', fields: { startDate: 'Invalid date.' } } } :
      saves === 2 ? { status: 503, json: { message: 'Save failed.' } } : { json: { id: 'saved', ...route.request().postDataJSON() } });
  });
  await ExperienceFixture.open(page);
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter 1–4,000 characters.'); expect(analysis).toBe(0);
  await page.getByLabel('Your experience', { exact: true }).fill('Original input');
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Analysis failed.'); await expect(page.getByLabel('Your experience', { exact: true })).toHaveValue('Original input');
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await page.getByLabel('Start date', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Accept & Save', exact: true }).click();
  await expect(page.getByText('Invalid date.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Start date', { exact: true })).toHaveValue('invalid');
  await page.getByLabel('Start date', { exact: true }).fill('2022');
  await page.getByRole('button', { name: 'Accept & Save', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Save failed.'); await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByLabel('Start date', { exact: true })).toHaveValue('2022');
  await page.getByRole('button', { name: 'Accept & Save', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Experience saved.');
});
test('pending operations permit one request and departure cannot save', async ({ page }) => {
  let analysis = 0, saves = 0;
  let release: (() => void) | undefined;
  await page.route('**/api/experiences/analyze', async route => {
    analysis++; await new Promise<void>(resolve => { release = resolve; }); await route.fulfill({ json: ExperienceFixture.fields });
  });
  await page.route('**/api/experiences', route => { saves++; return route.fulfill({ json: { id: 'saved' } }); });
  await ExperienceFixture.open(page); await page.getByLabel('Your experience', { exact: true }).fill('Original input');
  await page.getByRole('button', { name: 'Analyze', exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page.getByRole('button', { name: 'Analyze…', exact: true })).toBeDisabled();
  await expect.poll(() => analysis).toBe(1);
  await page.getByRole('button', { name: 'Workspace home', exact: true }).click(); release?.();
  await page.getByRole('button', { name: 'Resume Builder', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Review your/ })).toHaveCount(0); expect(saves).toBe(0);
});

test('pending save disables repeated acceptance and preserves the preview', async ({ page }) => {
  let saves = 0; let release: (() => void) | undefined;
  await page.route('**/api/experiences/analyze', route => route.fulfill({ json: ExperienceFixture.fields }));
  await page.route('**/api/experiences', async route => {
    saves++; await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ json: { id: 'saved', ...route.request().postDataJSON() } });
  });
  await ExperienceFixture.open(page); await ExperienceFixture.analyze(page);
  await expect(page.getByRole('heading', { name: 'Review your project' })).toBeFocused();
  await page.getByRole('button', { name: 'Accept & Save', exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page.getByRole('button', { name: 'Save…', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
  await expect.poll(() => saves).toBe(1);
  await expect(page.getByRole('status')).toHaveCount(0);
  release?.(); await expect(page.getByRole('status')).toHaveText('Experience saved.'); expect(saves).toBe(1);
});
