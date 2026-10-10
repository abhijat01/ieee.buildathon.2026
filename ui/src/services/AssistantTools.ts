import type { FieldChange, ProposedChange, ProposedField } from './AssistantProposals';
import type { ItemFormValues } from './PortfolioItemForm';

/** A frontend tool call of the assistant. `args` is the JSON text from the event stream. */
export interface ToolCall { id: string; name: string; args: string }
/** The result that the browser returns to the assistant. It does not contain the decision of the member. */
export interface ToolResult { status: 'shown' | 'error'; message: string }
export interface ToolOutcome { change: ProposedChange | null; result: ToolResult }

/** The arguments are not valid. The message is written for the assistant. */
class InvalidArguments extends Error {}

const FIELDS: readonly ProposedField[] = ['title', 'type', 'company', 'startDate', 'endDate'];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const SHOWN: ToolResult = { status: 'shown', message: 'The form shows the proposal. The member did not decide yet.' };

/**
 * The frontend tools of the portfolio assistant. A valid tool call becomes a proposal for the form.
 * Invalid arguments give an error result. The tools do not apply the save rules. The server does that at save.
 */
export class AssistantTools {
  // The server owns these limits. Their source is the parameter schema of each tool in
  // server/src/ieee/portfolio/assistant: propose_text_arguments.py, propose_skills_arguments.py, and field_change.py.
  static readonly textLimit = 4000;
  static readonly labelLimit = 40;
  static readonly reasonLimit = 200;
  static readonly skillLimit = 40;
  static readonly skillCount = 20;
  static readonly valueLimit = 160;

  /** The tools that the browser declares. The server owns the parameter schema of each tool. */
  static readonly definitions = [
    { name: 'proposeText', description: 'Show a new experience text as a proposal in the form.' },
    { name: 'proposeSkills', description: 'Show skills to add as proposals in the form.' },
    { name: 'proposeFields', description: 'Show new field values as proposals in the form.' },
  ];

  static supports(name: string): boolean { return AssistantTools.definitions.some(tool => tool.name === name); }

  /** Changes one tool call to a proposal and a tool result. `values` are the current form values. */
  static read(call: ToolCall, values: ItemFormValues): ToolOutcome {
    try {
      const args = AssistantTools.parse(call.args);
      if (call.name === 'proposeText') return { change: AssistantTools.text(args), result: SHOWN };
      if (call.name === 'proposeSkills') return { change: AssistantTools.skills(args, values), result: SHOWN };
      if (call.name === 'proposeFields') return { change: AssistantTools.fields(args, values), result: SHOWN };
      throw new InvalidArguments('The tool is not supported.');
    } catch (error) {
      if (!(error instanceof InvalidArguments)) throw error;
      return { change: null, result: { status: 'error', message: error.message } };
    }
  }

  private static parse(args: string): Record<string, unknown> {
    let parsed: unknown;
    try { parsed = JSON.parse(args); } catch { throw new InvalidArguments('The arguments are not valid JSON.'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new InvalidArguments('The arguments must be a JSON object.');
    return parsed as Record<string, unknown>;
  }

  private static string(value: unknown, name: string, limit: number, allowEmpty = false): string {
    if (typeof value !== 'string' || value.length > limit || (!allowEmpty && !value.trim()))
      throw new InvalidArguments(`${name} must be a text of ${allowEmpty ? 0 : 1} to ${limit} characters.`);
    return value;
  }

  private static text(args: Record<string, unknown>): ProposedChange {
    return { kind: 'text', text: AssistantTools.string(args.text, 'text', AssistantTools.textLimit),
      label: AssistantTools.string(args.label, 'label', AssistantTools.labelLimit).trim(),
      reason: AssistantTools.string(args.reason, 'reason', AssistantTools.reasonLimit, true).trim() };
  }

  private static skills(args: Record<string, unknown>, values: ItemFormValues): ProposedChange {
    if (!Array.isArray(args.skills) || !args.skills.length || args.skills.length > AssistantTools.skillCount)
      throw new InvalidArguments(`skills must be a list of 1 to ${AssistantTools.skillCount} skills.`);
    const known = new Set(values.skills.map(skill => skill.trim().toLowerCase()));
    const skills: string[] = [];
    for (const entry of args.skills) {
      const skill = AssistantTools.string(entry, 'Each skill', AssistantTools.skillLimit).trim();
      if (known.has(skill.toLowerCase())) continue;
      known.add(skill.toLowerCase());
      skills.push(skill);
    }
    if (!skills.length) throw new InvalidArguments('The skill list already has each of these skills.');
    return { kind: 'skills', skills };
  }

  private static fields(args: Record<string, unknown>, values: ItemFormValues): ProposedChange {
    if (!Array.isArray(args.changes) || !args.changes.length || args.changes.length > FIELDS.length)
      throw new InvalidArguments(`changes must be a list of 1 to ${FIELDS.length} field changes.`);
    const changes = args.changes.map(entry => AssistantTools.fieldChange(entry));
    if (new Set(changes.map(change => change.field)).size !== changes.length) throw new InvalidArguments('Give at most one change for each field.');
    const different = changes.filter(change => change.value !== values[change.field]);
    if (!different.length) throw new InvalidArguments('The fields already have these values.');
    return { kind: 'fields', changes: different };
  }

  private static fieldChange(entry: unknown): FieldChange {
    const change = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const field = FIELDS.find(name => name === change.field);
    if (!field) throw new InvalidArguments(`field must be one of: ${FIELDS.join(', ')}.`);
    const value = AssistantTools.string(change.value, 'value', AssistantTools.valueLimit, true).trim();
    if (field === 'type' && value !== 'PROJECT' && value !== 'WORK') throw new InvalidArguments('A type value must be PROJECT or WORK.');
    if (field === 'startDate' && !MONTH.test(value)) throw new InvalidArguments('A startDate value must have the format YYYY-MM.');
    if (field === 'endDate' && value && !MONTH.test(value)) throw new InvalidArguments('An endDate value must have the format YYYY-MM, or be empty.');
    return { field, value, reason: AssistantTools.string(change.reason, 'reason', AssistantTools.reasonLimit, true).trim() };
  }
}
