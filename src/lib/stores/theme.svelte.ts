// App fixado em tema escuro (decisao de design). Mantido como modulo
// simples caso um seletor de tema volte no futuro.

/** Garante a classe .dark no <html>. */
export function applyTheme(): void {
  document.documentElement.classList.add('dark');
}

/** Inicializa o tema (sempre escuro). */
export function initTheme(): void {
  applyTheme();
}
