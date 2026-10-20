import type { HistoryRecord } from '../db';

export type Tab = 'calc' | 'profiles' | 'history' | 'settings';

// Aba ativa (compartilhada para permitir navegação entre telas).
export const ui = $state<{ tab: Tab }>({ tab: 'calc' });

// Registro de histórico que a Calculadora deve carregar para edição.
export const editState = $state<{ record: HistoryRecord | null }>({ record: null });

/** Pede para editar um cálculo salvo: carrega na Calculadora e abre a aba. */
export function editHistory(record: HistoryRecord): void {
  editState.record = record;
  ui.tab = 'calc';
}
