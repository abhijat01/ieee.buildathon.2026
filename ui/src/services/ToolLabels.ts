export interface ToolLabel { running: string; done: string }

/** Friendly names for agent tools. The interface never shows raw tool arguments or results. */
export class ToolLabels {
  private static readonly labels: Record<string, ToolLabel> = {
    setTheme: { running: 'Updating theme', done: 'Updated theme' },
    listNotes: { running: 'Reading notes', done: 'Read notes' },
    saveNote: { running: 'Saving note', done: 'Saved note' },
    fetchWebsite: { running: 'Reading website', done: 'Read website' },
    browseWebsite: { running: 'Browsing website', done: 'Browsed website' },
    getCurrentTime: { running: 'Checking the time', done: 'Checked the time' },
  };

  static of(name: string): ToolLabel {
    return ToolLabels.labels[name] ?? { running: 'Using a tool', done: 'Used a tool' };
  }

  /** Return a short, safe detail from the tool arguments: the website host or the theme name. */
  static detail(name: string, args: string): string {
    let parsed: unknown;
    try { parsed = JSON.parse(args); } catch { return ''; }
    if (!parsed || typeof parsed !== 'object') return '';
    const values = parsed as Record<string, unknown>;
    if ((name === 'fetchWebsite' || name === 'browseWebsite') && typeof values.url === 'string') return ToolLabels.host(values.url);
    if (name === 'setTheme' && (values.theme === 'light' || values.theme === 'dark')) return values.theme;
    return '';
  }

  private static host(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
  }
}
