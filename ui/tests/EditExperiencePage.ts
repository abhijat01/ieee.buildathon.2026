import { expect, type Locator, type Page } from '@playwright/test';
import { AssistantFixture, type Reply } from './AssistantFixture';
import { PortfolioFixture } from './PortfolioFixture';

interface Options { aiAvailable?: boolean }

/** Opens the Edit experience screen with a simulated portfolio API and a simulated agent. */
export class EditExperiencePage {
  static readonly text = '## Atlas reporting dashboard\n\nI built the first version of the Atlas dashboard at **Acme Corp**. The work went on until the middle of 2023.\n\n- Python data pipeline\n- React UI for the sales team\n- Deployed it on Kubernetes with Docker';
  static readonly improvedText = '## Atlas reporting dashboard\n\nBuilt the first version of the Atlas dashboard at **Acme Corp**. The work continued until the middle of 2023.\n\n- Built the data pipeline with Python\n- Built the React UI for the sales team\n- Deployed the dashboard on Kubernetes with Docker';
  static readonly improve: Reply = { text: 'I made the text more active. I kept each fact and added none.',
    tool: { name: 'proposeText', args: { text: EditExperiencePage.improvedText, label: 'Improved text', reason: 'More active verbs. The facts are the same.' } } };
  static readonly skills: Reply = { text: 'The text names 2 skills that are not in your list: Kubernetes, Docker.',
    tool: { name: 'proposeSkills', args: { skills: ['Kubernetes', 'Docker', 'Python'] } } };
  static readonly fields: Reply = { text: 'I found 1 field that does not agree with the text.',
    tool: { name: 'proposeFields', args: { changes: [{ field: 'endDate', value: '2023-06', reason: 'The text says: “until the middle of 2023”.' }] } } };

  readonly pane: Locator;
  readonly editor: Locator;

  private constructor(readonly page: Page, readonly portfolio: PortfolioFixture, readonly assistant: AssistantFixture, private readonly phone: boolean) {
    this.pane = page.getByRole('complementary', { name: 'Portfolio assistant' });
    this.editor = page.getByRole('textbox', { name: 'Experience text' });
  }

  /** Opens the portfolio with the items of the mockup and selects the first item. */
  static async open(page: Page, project: string, options: Options = {}): Promise<EditExperiencePage> {
    const items = PortfolioFixture.savedItems();
    items[0] = { ...items[0], endDate: '2023-03', text: EditExperiencePage.text };
    const portfolio = await PortfolioFixture.open(page, { items, aiAvailable: options.aiAvailable });
    const assistant = await AssistantFixture.attach(page);
    const edit = new EditExperiencePage(page, portfolio, assistant, project === 'mobile');
    await edit.openItem();
    return edit;
  }

  async openItem(title = 'Atlas reporting dashboard'): Promise<void> {
    await this.page.locator('.pf-card', { hasText: title }).click();
    await expect(this.page.getByRole('heading', { name: 'Edit experience', level: 1 })).toBeVisible();
    await expect(this.page.getByLabel('Title')).toHaveValue(title);
  }

  /** On a phone, the assistant opens from the Assistant button. On a wide screen, it is always open. */
  async openAssistant(): Promise<void> {
    if (this.phone && !(await this.pane.isVisible())) await this.page.getByRole('button', { name: 'Assistant', exact: true }).click();
    await expect(this.pane).toBeVisible();
  }

  async closeAssistant(): Promise<void> {
    if (!this.phone || !(await this.pane.isVisible())) return;
    await this.pane.getByRole('button', { name: 'Close the assistant' }).click();
    await expect(this.pane).toBeHidden();
  }

  /** Selects a quick action and waits for the end of the answer. Then it shows the form again. */
  async quick(label: string): Promise<void> {
    await this.openAssistant();
    await this.pane.getByRole('button', { name: label }).click();
    await this.answered();
  }

  async say(text: string): Promise<void> {
    await this.openAssistant();
    await this.pane.getByLabel('Message to the assistant').fill(text);
    await this.pane.getByLabel('Message to the assistant').press('Enter');
    await this.answered();
  }

  /** The quick actions are available again at the end of a run. */
  async answered(): Promise<void> {
    await expect(this.pane.getByRole('group', { name: 'Quick actions' }).getByRole('button').first()).toBeEnabled();
    await this.closeAssistant();
  }

  /** Checks a line in the conversation, for example "You accepted the new text". */
  async expectActivity(text: string, count = 1): Promise<void> {
    await this.openAssistant();
    await expect(this.pane.locator('.msg-activity', { hasText: text })).toHaveCount(count);
    await this.closeAssistant();
  }

  saveButton(): Locator { return this.page.getByRole('button', { name: 'Save changes' }); }
  discardButton(): Locator { return this.page.getByRole('button', { name: 'Discard', exact: true }); }
  dialog(): Locator { return this.page.getByRole('dialog', { name: 'Discard your changes?' }); }
  skillChips(): Locator { return this.page.locator('.skill-box .chip:not(.proposed)'); }
}
