export interface Session {
  name: string; email: string | null; csrfToken: string; csrfHeader: string;
}
export interface Note { id: string; title: string; body: string; createdAt: string }

export class AuthenticationRequired extends Error {
  constructor(message: string) { super(message); this.name = 'AuthenticationRequired'; }
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
