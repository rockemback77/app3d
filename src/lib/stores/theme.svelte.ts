export type Theme = 'light' | 'dark' | 'system';

const KEY = 'custo3d.theme';

function load(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

export const theme = $state<{ value: Theme }>({ value: load() });

function systemPrefersDark(): boolean {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Aplica a classe .dark no <html> conforme a preferência atual. */
export function applyTheme(): void {
  const dark = theme.value === 'dark' || (theme.value === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

export function setTheme(t: Theme): void {
  theme.value = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
  applyTheme();
}

/** Inicializa o tema e acompanha mudanças do sistema quando em modo 'system'. */
export function initTheme(): void {
  applyTheme();
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme.value === 'system') applyTheme();
    });
  }
}
