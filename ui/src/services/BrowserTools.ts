import { ThemeService, type Theme } from './ThemeService';

export class BrowserTools {
  constructor(private readonly onTheme: (theme: Theme) => void) {}

  static definitions = [{ name: 'setTheme', description: 'Change the interface theme to light or dark. The browser runs this tool. Wait for its result.',
    parameters: { type: 'object', properties: { theme: { type: 'string', enum: ['light', 'dark'] } }, required: ['theme'] } }];

  static supports(name: string): boolean { return BrowserTools.definitions.some(tool => tool.name === name); }

  execute(name: string, args: string): Record<string, string> {
    if (name !== 'setTheme') throw new Error('The browser tool is not supported.');
    const parsed: unknown = JSON.parse(args);
    if (!parsed || typeof parsed !== 'object' || !('theme' in parsed) ||
      (parsed.theme !== 'light' && parsed.theme !== 'dark')) throw new Error('The theme must be light or dark.');
    ThemeService.apply(parsed.theme); this.onTheme(parsed.theme);
    return { status: 'success', theme: parsed.theme };
  }
}
