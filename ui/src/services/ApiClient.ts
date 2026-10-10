export interface Session {
  name: string; email: string | null; csrfToken: string; csrfHeader: string; aiAvailable: boolean;
}
export interface Note { id: string; title: string; body: string; createdAt: string }

export class AuthenticationRequired extends Error {
  constructor(message: string) { super(message); this.name = 'AuthenticationRequired'; }
}

/** A request that the server rejected. The message is written for the member. */
export class ApiError extends Error {
  constructor(message: string) { super(message); this.name = 'ApiError'; }
}

export type ExperienceType = 'PROJECT' | 'WORK';
export type MatchLevel = 'VERY_SIMILAR' | 'SOME_OVERLAP';
export interface ExtractedFields { title: string; type: ExperienceType; company: string | null;
  startDate: string | null; endDate: string | null; skills: string[] }
export interface DuplicateMatch { id: string; title: string; company: string | null; startDate: string | null;
  endDate: string | null; level: MatchLevel; reason: string }
export interface Analysis { fields: ExtractedFields; duplicates: DuplicateMatch[] }
export interface ImprovedText { text: string; note: string }
export interface SavePortfolioItem extends ExtractedFields { originalText: string; finalText: string }
export interface PortfolioItem extends ExtractedFields { id: string; text: string; createdAt: string }

export class ApiClient {
  private session: Session | null = null;

  async loadSession(): Promise<Session> {
    const response = await fetch('/api/session', { credentials: 'same-origin' });
    await this.check(response);
    this.session = await response.json() as Session;
    return this.session;
  }

  async notes(): Promise<Note[]> {
    const response = await fetch('/api/notes', { credentials: 'same-origin' });
    await this.check(response);
    return response.json() as Promise<Note[]>;
  }

  async saveNote(title: string, body: string): Promise<Note> {
    const response = await fetch('/api/notes', { method: 'POST', credentials: 'same-origin',
      headers: this.headers(), body: JSON.stringify({ title, body }) });
    await this.check(response);
    return response.json() as Promise<Note>;
  }

  async portfolioItems(): Promise<PortfolioItem[]> {
    const response = await fetch('/api/portfolio', { credentials: 'same-origin' });
    await this.check(response);
    return response.json() as Promise<PortfolioItem[]>;
  }

  async portfolioItem(id: string): Promise<PortfolioItem> {
    const response = await fetch(`/api/portfolio/${encodeURIComponent(id)}`, { credentials: 'same-origin' });
    await this.check(response);
    return response.json() as Promise<PortfolioItem>;
  }

  analyzeExperience(text: string): Promise<Analysis> { return this.post('/api/portfolio/analyze', { text }); }

  improveExperience(text: string, instruction: string): Promise<ImprovedText> {
    return this.post('/api/portfolio/improve', { text, instruction });
  }

  savePortfolioItem(item: SavePortfolioItem): Promise<PortfolioItem> { return this.post('/api/portfolio', item); }

  /** Sends a portfolio request. A rejected request gives an ApiError with the server message. */
  private async post<T>(path: string, body: object): Promise<T> {
    const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: this.headers(), body: JSON.stringify(body) });
    if (response.status === 401 || response.status === 403) await this.check(response);
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { message?: string };
      throw new ApiError(error.message ?? 'The server could not complete this request. Please try again.');
    }
    return response.json() as Promise<T>;
  }

  headers(): Record<string, string> {
    if (!this.session) throw new AuthenticationRequired('Please sign in.');
    return { 'Content-Type': 'application/json', [this.session.csrfHeader]: this.session.csrfToken };
  }

  logout(): void {
    if (!this.session) return;
    const form = document.createElement('form');
    form.method = 'POST'; form.action = '/api/logout';
    const csrf = document.createElement('input');
    csrf.type = 'hidden'; csrf.name = '_csrf'; csrf.value = this.session.csrfToken;
    form.append(csrf); document.body.append(form); form.submit();
  }

  async check(response: Response): Promise<void> {
    if (response.status === 401) throw new AuthenticationRequired('Your session expired. Please sign in again.');
    if (response.status === 403) throw new Error('This request was rejected. Reload the page and try again.');
    if (!response.ok) throw new Error('The server could not complete this request. Please try again.');
  }
}
