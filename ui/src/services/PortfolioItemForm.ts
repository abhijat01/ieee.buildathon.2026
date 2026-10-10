import type { ExperienceType, PortfolioItem, UpdatePortfolioItem } from './ApiClient';

/** The values in the edit form. An empty text field is an empty string. */
export interface ItemFormValues {
  title: string; type: ExperienceType; company: string; startDate: string; endDate: string; skills: string[]; text: string;
}

/** Holds the form values of the open item and compares them with the saved item. It does not change. */
export class PortfolioItemForm {
  readonly values: ItemFormValues;

  constructor(readonly saved: PortfolioItem, values?: ItemFormValues) {
    this.values = values ?? { title: saved.title, type: saved.type, company: saved.company ?? '', startDate: saved.startDate ?? '',
      endDate: saved.endDate ?? '', skills: [...saved.skills], text: saved.text };
  }

  /** Returns a new form with the changed values. */
  with(change: Partial<ItemFormValues>): PortfolioItemForm {
    return new PortfolioItemForm(this.saved, { ...this.values, ...change });
  }

  /**
   * Returns the form after a save. `sent` is the form that the save request used.
   * A change that the member made during the request stays in the form as an unsaved change.
   */
  afterSave(item: PortfolioItem, sent: PortfolioItemForm): PortfolioItemForm {
    return this.values === sent.values ? new PortfolioItemForm(item) : new PortfolioItemForm(item, this.values);
  }

  hasChanges(): boolean {
    const saved = new PortfolioItemForm(this.saved).values;
    const names = ['title', 'type', 'company', 'startDate', 'endDate', 'text'] as const;
    return names.some(name => saved[name] !== this.values[name])
      || saved.skills.length !== this.values.skills.length
      || saved.skills.some((skill, index) => skill !== this.values.skills[index]);
  }

  /** Returns the body of the save request. The server applies the save rules. */
  request(): UpdatePortfolioItem {
    const { title, type, company, startDate, endDate, skills, text } = this.values;
    return { title, type, company: company || null, startDate: startDate || null, endDate: endDate || null, skills, finalText: text };
  }
}
