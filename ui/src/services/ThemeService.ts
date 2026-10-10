export type Theme = 'light' | 'dark';

export class ThemeService {
  static current(): Theme {
    const saved = localStorage.getItem('ieee-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  static apply(theme: Theme): void {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('ieee-theme', theme);
  }
}
