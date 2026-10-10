import type { DuplicateMatch, ExtractedFields, ImprovedText } from './ApiClient';

/** A new experience that the member did not save yet. */
export interface ExperienceDraft {
  /** Identifies this draft. A late server answer for another draft is ignored. */
  id: number;
  step: 'write' | 'review';
  tab: 'write' | 'preview';
  /** The text in the editor, and later the text that the member approves. */
  text: string;
  /** The text that the member analyzed. The AI never changes it. */
  original: string;
  fields: ExtractedFields | null;
  duplicates: DuplicateMatch[];
  busy: 'analyze' | 'improve' | 'save' | null;
  error: string | null;
  improveOpen: boolean;
  instruction: string;
  proposal: ImprovedText | null;
  improvedInUse: boolean;
}

export class ExperienceDrafts {
  static readonly textLimit = 4000;
  static readonly instructionLimit = 300;
  static readonly nameLimit = 160;
  static readonly dateLimit = 10;
  static readonly skillLimit = 40;
  private static nextId = 1;

  static empty(): ExperienceDraft {
    return { id: ExperienceDrafts.nextId++, step: 'write', tab: 'write', text: '', original: '', fields: null, duplicates: [], busy: null, error: null,
      improveOpen: false, instruction: '', proposal: null, improvedInUse: false };
  }
}
