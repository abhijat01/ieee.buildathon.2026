export interface Session {
  name: string; email: string | null; csrfToken: string; csrfHeader: string; agentAvailable: boolean;
}
export interface Note { id: string; title: string; body: string; createdAt: string }

export class AuthenticationRequired extends Error {
  constructor(message: string) { super(message); this.name = 'AuthenticationRequired'; }
}

export type ExperienceType = 'PROJECT' | 'PROFESSIONAL';
export interface ExperienceFields { company: string | null; projectName: string | null; startDate: string | null; endDate: string | null; description: string | null }
export interface AnalyzeExperience { type: ExperienceType; originalInput: string }
export interface SaveExperience extends AnalyzeExperience, ExperienceFields {}
export interface SavedExperience extends SaveExperience { id: string; createdAt: string }
export class ExperienceRequestError extends Error {
  constructor(message: string, public readonly fields: Record<string, string> = {}) { super(message); }
}

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

  async analyzeExperience(input: AnalyzeExperience): Promise<ExperienceFields> {
    return this.experienceRequest('/api/experiences/analyze', input);
  }
  async saveExperience(input: SaveExperience): Promise<SavedExperience> {
    return this.experienceRequest('/api/experiences', input);
  }
  private async experienceRequest<T>(path: string, input: AnalyzeExperience | SaveExperience): Promise<T> {
    const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: this.headers(), body: JSON.stringify(input) });
    if (response.status === 401 || response.status === 403) await this.check(response);
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { message?: string; fields?: Record<string, string> };
      throw new ExperienceRequestError(error.message ?? 'The request failed. Please retry.', error.fields);
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
