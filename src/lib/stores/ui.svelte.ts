import type { HistoryRecord } from '../db';

export type Tab = 'calc' | 'profiles' | 'costs' | 'sales' | 'history' | 'stock' | 'settings';

// Aba ativa + estado do menu lateral (compartilhado para navegação entre telas).
export const ui = $state<{ tab: Tab; menuOpen: boolean }>({ tab: 'calc', menuOpen: false });

// Registro de histórico que a Calculadora deve carregar para edição.
export const editState = $state<{ record: HistoryRecord | null }>({ record: null });

/** Pede para editar um cálculo salvo: carrega na Calculadora e abre a aba. */
export function editHistory(record: HistoryRecord): void {
  editState.record = record;
  ui.tab = 'calc';
}
