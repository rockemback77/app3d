import { isActive } from './subscription.svelte';
import { startCheckout } from './checkout';

// Paywall global: quando um usuário SEM assinatura ativa tenta usar um recurso
// pago, abrimos este modal em vez de executar a ação. "Modo leitura": ele vê o
// que já cadastrou, mas nada que grava/usa recurso funciona.
export const paywall = $state<{
  open: boolean;
  feature: string;
  busy: boolean;
  error: string | null;
}>({
  open: false,
  feature: '',
  busy: false,
  error: null,
});

/** Pode usar recursos pagos? (assinatura ativa ou trial ainda vigente) */
export function canUse(): boolean {
  return isActive();
}

/**
 * Porta de entrada de toda ação paga. Se pode usar, retorna true e a ação segue.
 * Senão, abre o paywall (com o nome do recurso) e retorna false — o chamador
 * deve abortar. Uso: `if (!requirePro('cadastrar filamentos')) return;`
 */
export function requirePro(feature = ''): boolean {
  if (isActive()) return true;
  paywall.feature = feature;
  paywall.error = null;
  paywall.busy = false;
  paywall.open = true;
  return false;
}

export function closePaywall(): void {
  paywall.open = false;
}

/** Botão "Assinar agora" do modal: inicia o checkout do Mercado Pago. */
export async function assinarFromPaywall(): Promise<void> {
  paywall.busy = true;
  paywall.error = null;
  const msg = await startCheckout();
  // Sucesso redireciona a página; se voltou mensagem, deu erro.
  if (msg) {
    paywall.error = msg;
    paywall.busy = false;
  }
}
