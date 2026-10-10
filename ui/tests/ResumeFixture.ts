import { expect, type Page, type Route } from '@playwright/test';

interface SampleItem { id: string; type: 'PROJECT' | 'WORK'; title: string; company: string; startDate: string; endDate: string;
  skills: string[]; relevance: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string; keywords: string[]; original: string; improved: string }
interface Options { empty?: boolean; aiAvailable?: boolean }
interface WriteBody { jobText: string; keywords: string[]; itemIds: string[] }

/** Simulates the portfolio list and the resume API in the browser. The sample data comes from the mockup of issue #3. */
export class ResumeFixture {
  static readonly analyzeMessage = 'The AI could not analyze the job description. Your text is safe. Try again.';
  static readonly writeMessage = 'The AI could not write the resume. Your selection is safe. Try again.';
  static readonly jobText = 'Senior Full-Stack Engineer, Data Products\nContoso Analytics · Remote\n\n- Build data pipelines with Python, SQL, and Airflow\n- Build user interfaces with React and TypeScript\n- Run services on Kubernetes in AWS\n- Nice to have: Snowflake and dbt';
  static readonly keywords = ['Python', 'SQL', 'PostgreSQL', 'React', 'TypeScript', 'Data pipelines', 'Airflow', 'Kubernetes', 'REST APIs', 'Mentoring', 'AWS', 'Snowflake', 'dbt'];
  static readonly requirements = ['Build data pipelines with Python, SQL, and Airflow', 'Build user interfaces with React and TypeScript',
    'Run services on Kubernetes in AWS', 'Lead projects and mentor engineers', '5 or more years of software engineering experience'];
  static readonly formatChecks = ['Standard section headings: Summary, Skills, Work Experience, Projects', 'One column. No tables, images, or text boxes',
    'Plain bullets and plain dates', 'Job keywords in the Skills section and in the descriptions'];
  static readonly items: SampleItem[] = [
    { id: 'p1', type: 'PROJECT', title: 'Atlas analytics dashboard', company: 'Acme Corp', startDate: '2022-03', endDate: '2023-06',
      skills: ['Python', 'PostgreSQL', 'React', 'TypeScript', 'Team lead'], relevance: 'HIGH',
      reason: 'Shows Python, PostgreSQL, React, and TypeScript in one data product. Shows team lead work.',
      keywords: ['Python', 'SQL', 'PostgreSQL', 'React', 'TypeScript', 'Data pipelines'],
      original: 'At **Acme Corp** I led the build of Atlas, an internal analytics dashboard.\n\n- Built the data pipeline with Python and PostgreSQL\n- Made the UI with React and TypeScript\n- Worked with 4 engineers and 1 designer',
      improved: '- Led 4 engineers and 1 designer to build Atlas, an internal analytics dashboard\n- Built the data pipeline with Python and SQL (PostgreSQL)\n- Delivered the user interface with React and TypeScript' },
    { id: 'p2', type: 'PROJECT', title: 'Sales data pipeline', company: 'Acme Corp', startDate: '2021-06', endDate: '2022-02',
      skills: ['Python', 'Airflow'], relevance: 'HIGH', reason: 'Shows data pipelines with Python and Airflow. The job asks for both.',
      keywords: ['Python', 'Airflow', 'Data pipelines'],
      original: 'A nightly pipeline that moves sales data into the warehouse.\n\n- Python and Airflow\n- 40 source tables',
      improved: '- Built a nightly data pipeline with Python and Airflow that loads sales data into the warehouse\n- Integrated 40 source tables' },
    { id: 'w1', type: 'WORK', title: 'Senior Software Engineer', company: 'Northwind Labs', startDate: '2019-01', endDate: '2021-05',
      skills: ['Java', 'Kubernetes', 'Mentoring'], relevance: 'MEDIUM', reason: 'Shows Kubernetes and mentoring. The main language is Java, not Python.',
      keywords: ['Kubernetes', 'Mentoring'],
      original: 'I worked in the platform team at **Northwind Labs**.\n\n- Moved 12 services to Kubernetes\n- Mentored 3 junior engineers',
      improved: '- Migrated 12 services to Kubernetes in the platform team\n- Mentored 3 junior engineers' },
    { id: 'w2', type: 'WORK', title: 'Software Engineer', company: 'Fabrikam Retail', startDate: '2016-07', endDate: '2018-12',
      skills: ['JavaScript', 'SQL', 'REST APIs'], relevance: 'MEDIUM', reason: 'Shows SQL and REST APIs. The work is older and does not use React.',
      keywords: ['SQL', 'REST APIs'],
      original: 'I built features for the online store at **Fabrikam Retail**.\n\n- REST APIs and SQL reports\n- JavaScript front end',
      improved: '- Built REST APIs and SQL reports for the online store\n- Developed front-end features with JavaScript' },
    { id: 'p3', type: 'PROJECT', title: 'Student branch website', company: 'IEEE Student Branch', startDate: '2015-09', endDate: '2016-05',
      skills: ['WordPress', 'PHP'], relevance: 'LOW', reason: 'The job does not ask for WordPress or PHP.', keywords: [],
      original: 'I made the website of the student branch.\n\n- WordPress theme and PHP plugins\n- 300 visitors each month',
      improved: '- Built the website of the student branch with WordPress and PHP\n- Reached 300 visitors each month' },
  ];

  failAi = false;
  analyzed: string[] = [];
  writes: WriteBody[] = [];
  private release: () => void = () => undefined;
  private gate: Promise<void> | null = null;

  private constructor(private page: Page, private options: Options) {}

  static async open(page: Page, options: Options = {}): Promise<ResumeFixture> {
    const fixture = new ResumeFixture(page, options);
    await page.route('**/api/session', route => route.fulfill({ json: { name: 'Abhijat', email: 'abhijat@example.test',
      csrfToken: 'test-csrf', csrfHeader: 'X-CSRF-TOKEN', aiAvailable: options.aiAvailable ?? true } }));
    await page.route('**/api/notes', route => route.fulfill({ json: [] }));
    await page.route('**/api/portfolio', route => route.fulfill({ json: fixture.portfolio() }));
    await page.route('**/api/resume/analyze', route => fixture.analyze(route));
    await page.route('**/api/resume/write', route => fixture.write(route));
    await page.goto('/');
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Resume', exact: true })).toBeVisible();
    return fixture;
  }

  /** Holds the next AI answers until the test calls the returned function. */
  holdAi(): () => void { this.gate = new Promise(resolve => { this.release = resolve; }); return () => { this.release(); this.gate = null; }; }

  async analyzeNow(): Promise<void> {
    await this.page.getByLabel('Job description').fill(ResumeFixture.jobText);
    await this.page.getByRole('button', { name: 'Analyze', exact: true }).click();
    await expect(this.page.getByRole('heading', { name: 'What the job needs' })).toBeVisible();
  }

  async writeNow(): Promise<void> {
    await this.page.getByRole('button', { name: 'Write resume' }).click();
    await expect(this.page.getByRole('heading', { name: 'Your resume' })).toBeVisible();
  }

  async expectNoOverflow(): Promise<void> {
    expect(await this.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }

  /** The Markdown that the simulated server returns for the given items. */
  static markdown(itemIds: string[]): string {
    const included = ResumeFixture.items.filter(item => itemIds.includes(item.id));
    const covered = ResumeFixture.keywords.filter(word => included.some(item => item.keywords.includes(word)));
    const skills = [...new Set([...covered, ...included.flatMap(item => item.skills)])];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = (value: string) => `${months[Number(value.split('-')[1]) - 1]} ${value.split('-')[0]}`;
    const section = (heading: string, type: string) => {
      const entries = included.filter(item => item.type === type).sort((a, b) => b.startDate.localeCompare(a.startDate));
      return entries.length ? [`## ${heading}`, ...entries.flatMap(item => [`### ${item.title} | ${item.company}\n${month(item.startDate)} - ${month(item.endDate)}`, item.improved])] : [];
    };
    return ['# Abhijat\n[Email] | [Phone] | [City] | [LinkedIn]', '## Summary', `Software engineer with experience in ${covered.slice(0, 5).join(', ')}.`,
      '## Skills', skills.join(', '), ...section('Work Experience', 'WORK'), ...section('Projects', 'PROJECT')].join('\n\n') + '\n';
  }

  private portfolio(): object[] {
    if (this.options.empty) return [];
    return ResumeFixture.items.map(item => ({ id: item.id, type: item.type, title: item.title, company: item.company, startDate: item.startDate,
      endDate: item.endDate, skills: item.skills, text: item.original, createdAt: '2026-09-12T10:00:00Z' }));
  }

  private async ai(route: Route, failure: string, answer: object): Promise<void> {
    if (this.gate) await this.gate;
    if (this.failAi) await route.fulfill({ status: 503, json: { message: failure } });
    else await route.fulfill({ json: answer });
  }

  private async analyze(route: Route): Promise<void> {
    this.analyzed.push((route.request().postDataJSON() as { jobText: string }).jobText);
    await this.ai(route, ResumeFixture.analyzeMessage, { jobTitle: 'Senior Full-Stack Engineer, Data Products', company: 'Contoso Analytics · Remote',
      requirements: ResumeFixture.requirements, keywords: ResumeFixture.keywords,
      items: ResumeFixture.items.map(item => ({ itemId: item.id, type: item.type, title: item.title, company: item.company, startDate: item.startDate,
        endDate: item.endDate, relevance: item.relevance, reason: item.reason, matchedKeywords: item.keywords, proposed: item.relevance !== 'LOW' })) });
  }

  private async write(route: Route): Promise<void> {
    const body = route.request().postDataJSON() as WriteBody;
    this.writes.push(body);
    const included = ResumeFixture.items.filter(item => body.itemIds.includes(item.id));
    const inItems = (items: SampleItem[], word: string) => items.some(item => item.keywords.includes(word));
    const inResume = ResumeFixture.keywords.filter(word => inItems(included, word));
    const inPortfolio = ResumeFixture.keywords.filter(word => inItems(ResumeFixture.items, word));
    await this.ai(route, ResumeFixture.writeMessage, { markdown: ResumeFixture.markdown(body.itemIds), fileName: 'resume-abhijat.md',
      descriptions: included.map(item => ({ itemId: item.id, title: item.title, company: item.company, originalText: item.original, improvedText: item.improved })),
      atsCheck: { keywords: { inResume, inExcludedItems: inPortfolio.filter(word => !inResume.includes(word)),
        notInPortfolio: ResumeFixture.keywords.filter(word => !inPortfolio.includes(word)) }, formatChecks: ResumeFixture.formatChecks } });
  }
}
