// Dinheiro em centavos inteiros. Nunca somar/multiplicar reais em float.

/** Formata centavos (inteiro) como moeda pt-BR: 12345 -> "R$ 123,45" */
export function formatBRL(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format((centavos || 0) / 100);
}

/** Formata centavos sem símbolo: 12345 -> "123,45" */
export function formatCentavos(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((centavos || 0) / 100);
}

/** Converte string pt-BR ("1.234,56" ou "1234,56" ou "12.5") em centavos inteiros. */
export function parseBRLToCentavos(input: string | number): number {
  if (typeof input === 'number') return Math.round(input * 100);
  const s = String(input).trim();
  if (!s) return 0;
  // remove separador de milhar "." e troca vírgula decimal por "."
  const normalized = s
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(normalized);
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100)); // sem valores negativos
}

/** Converte string pt-BR num número decimal genérico (gramas, horas, %). */
export function parseNumberBR(input: string | number): number {
  if (typeof input === 'number') return input;
  const s = String(input).trim();
  if (!s) return 0;
  const normalized = s.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return isFinite(n) ? Math.max(0, n) : 0; // sem valores negativos
}

/** Número decimal -> string pt-BR com N casas. */
export function formatNumberBR(n: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n || 0);
}
