import { expect, type Page, type Route } from '@playwright/test';

interface Item { id: string; type: string; title: string; company: string | null; startDate: string | null; endDate: string | null;
  skills: string[]; text: string; createdAt: string }
interface Options { items?: Item[]; aiAvailable?: boolean }

/** Simulates the portfolio API in the browser. Tests change the public fields to select a server behavior. */
export class PortfolioFixture {
  static readonly original = '## Atlas analytics dashboard\n\nAt **Acme Corp** I led the build of Atlas, an internal analytics dashboard, from March 2022 to June 2023.\n\n- Built the data pipeline with Python and PostgreSQL\n- Made the UI with React and TypeScript\n- Worked with 4 engineers and 1 designer\n\nThe dashboard made reports faster for the sales team.';
  static readonly improved = '## Atlas analytics dashboard\n\nLed a team of 5 at **Acme Corp** to build Atlas, an internal analytics dashboard (March 2022 – June 2023).\n\n- Designed and built the data pipeline with Python and PostgreSQL\n- Delivered the UI with React and TypeScript\n- Led 4 engineers and 1 designer from the first design to the release\n\n**Result:** The sales team gets reports faster. _Add a number here, for example the time saved for each report._';
  static readonly note = 'The AI did not add new facts. It marked a place where a number from you helps.';
  static readonly fields = { title: 'Atlas analytics dashboard', type: 'PROJECT', company: 'Acme Corp', startDate: '2022-03', endDate: '2023-06',
    skills: ['Python', 'PostgreSQL', 'React', 'TypeScript', 'Team lead'] };
  static readonly aiMessage = 'The AI is not available at this time. Your text is safe. Try again.';

  static savedItems(): Item[] {
    return [
      { id: 'a1', type: 'PROJECT', title: 'Atlas reporting dashboard', company: 'Acme Corp', startDate: '2022-03', endDate: '2023-06',
        skills: ['Python', 'React', 'PostgreSQL'], text: '## Atlas reporting dashboard\n\nI built the first version of the Atlas dashboard at **Acme Corp**.', createdAt: '2026-09-12T10:00:00Z' },
      { id: 'a2', type: 'PROJECT', title: 'Sales data pipeline', company: 'Acme Corp', startDate: '2021-06', endDate: '2022-02',
        skills: ['Python', 'Airflow'], text: 'A nightly pipeline that moves sales data into the warehouse.', createdAt: '2026-08-30T10:00:00Z' },
      { id: 'a3', type: 'WORK', title: 'Senior Software Engineer', company: 'Northwind Labs', startDate: '2019-01', endDate: '2021-05',
        skills: ['Java', 'Kubernetes', 'Mentoring'], text: 'I worked in the platform team at **Northwind Labs**.', createdAt: '2026-08-30T09:00:00Z' },
    ];
  }

  items: Item[];
  fields: object = PortfolioFixture.fields;
  failAi = false;
  saveError: string | null = null;
  saves: Record<string, unknown>[] = [];
  analyzed: string[] = [];
  instructions: string[] = [];
  private release: () => void = () => undefined;
  private gate: Promise<void> | null = null;

  private constructor(private page: Page, options: Options) { this.items = options.items ?? PortfolioFixture.savedItems(); }

  static async open(page: Page, options: Options = {}): Promise<PortfolioFixture> {
    const fixture = new PortfolioFixture(page, options);
    await page.route('**/api/session', route => route.fulfill({ json: { name: 'Abhijat', email: 'abhijat@example.test',
      csrfToken: 'test-csrf', csrfHeader: 'X-CSRF-TOKEN', aiAvailable: options.aiAvailable ?? true } }));
    await page.route('**/api/notes', route => route.fulfill({ json: [] }));
    await page.route(/\/api\/portfolio\/[^/]+$/, route => fixture.item(route));
    await page.route('**/api/portfolio', route => fixture.collection(route));
    await page.route('**/api/portfolio/analyze', route => fixture.analyze(route));
    await page.route('**/api/portfolio/improve', route => fixture.improve(route));
    await page.goto('/');
    await page.getByRole('button', { name: 'Portfolio', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Portfolio', exact: true })).toBeVisible();
    return fixture;
  }

  /** Holds the next AI answers until the test calls the returned function. */
  holdAi(): () => void { this.gate = new Promise(resolve => { this.release = resolve; }); return () => { this.release(); this.gate = null; }; }

  async write(text: string = PortfolioFixture.original): Promise<void> {
    await this.page.getByRole('button', { name: /Add experience|Your first experience/ }).first().click();
    await this.page.getByLabel('Your experience').fill(text);
  }

  async analyzeNow(text: string = PortfolioFixture.original): Promise<void> {
    await this.write(text);
    await this.page.getByRole('button', { name: 'Analyze', exact: true }).click();
    await expect(this.page.getByRole('heading', { name: 'Extracted information' })).toBeVisible();
  }

  async expectNoOverflow(): Promise<void> {
    expect(await this.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }

  private duplicates(): object[] {
    const levels: Record<string, [string, string]> = { a1: ['VERY_SIMILAR', 'Similar title · Same company · Same period'], a2: ['SOME_OVERLAP', 'Same company'] };
    return this.items.filter(item => levels[item.id]).map(item => ({ id: item.id, title: item.title, company: item.company,
      startDate: item.startDate, endDate: item.endDate, level: levels[item.id][0], reason: levels[item.id][1] }));
  }

  private async ai(route: Route, answer: object): Promise<void> {
    if (this.gate) await this.gate;
    if (this.failAi) await route.fulfill({ status: 503, json: { message: PortfolioFixture.aiMessage } });
    else await route.fulfill({ json: answer });
  }

  private analyze(route: Route): Promise<void> {
    this.analyzed.push(route.request().postDataJSON().text);
    return this.ai(route, { fields: this.fields, duplicates: this.duplicates() });
  }

  private improve(route: Route): Promise<void> {
    this.instructions.push(route.request().postDataJSON().instruction);
    return this.ai(route, { text: PortfolioFixture.improved, note: PortfolioFixture.note });
  }

  private async collection(route: Route): Promise<void> {
    if (route.request().method() !== 'POST') return route.fulfill({ json: this.items });
    if (this.saveError) return route.fulfill({ status: 400, json: { message: this.saveError } });
    const body = route.request().postDataJSON();
    expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
    this.saves.push(body);
    const item: Item = { id: `new-${this.saves.length}`, type: body.type, title: body.title, company: body.company, startDate: body.startDate,
      endDate: body.endDate, skills: body.skills, text: body.finalText, createdAt: new Date().toISOString() };
    this.items = [item, ...this.items];
    return route.fulfill({ json: item });
  }

  private item(route: Route): Promise<void> {
    const id = new URL(route.request().url()).pathname.split('/').pop();
    if (id === 'analyze' || id === 'improve') return route.fallback();
    const item = this.items.find(entry => entry.id === id);
    return item ? route.fulfill({ json: item }) : route.fulfill({ status: 404, json: { message: 'The portfolio item does not exist.' } });
  }
}
