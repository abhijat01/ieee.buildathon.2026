import { test, expect, type Page } from '@playwright/test';

class WorkspaceFixture {
  static async signedIn(page: Page) {
    const notes: object[] = [];
    await page.route('**/api/session', route => route.fulfill({ json: { name: 'Abhijat', email: 'abhijat@example.test',
      csrfToken: 'test-csrf', csrfHeader: 'X-CSRF-TOKEN' } }));
    await page.route('**/api/notes', async route => {
      if (route.request().method() === 'POST') {
        const note = { id: '1', ...route.request().postDataJSON(), createdAt: new Date().toISOString() };
        notes.push(note); await route.fulfill({ json: note });
      } else await route.fulfill({ json: notes });
    });
    await page.goto('/'); await expect(page.getByRole('heading', { name: 'Workspace', exact: true })).toBeVisible();
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

test('the workspace has no agent and no Resume Builder', async ({ page }) => {
  await WorkspaceFixture.signedIn(page);
  await expect(page.getByRole('navigation', { name: 'Workspace' }).getByRole('button')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Resume Builder' })).toHaveCount(0);
  await expect(page.getByText('IEEEAgent')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
