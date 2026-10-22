import { supabase } from '../supabase';
import { auth } from './auth.svelte';

type SubStatus = 'unknown' | 'inactive' | 'active' | 'trialing' | 'past_due' | 'canceled';

/** Dias de trial grátis a partir da criação da conta. */
const TRIAL_DAYS = 7;

/** Fim do trial = criação da conta + TRIAL_DAYS. null se sem data. */
function trialEndFromUser(): number | null {
  const created = auth.user?.created_at;
  if (!created) return null;
  return new Date(created).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000;
}

export const subscription = $state<{
  loading: boolean;
  status: SubStatus;
  periodEnd: number | null;
  error: string | null;
}>({
  loading: true,
  status: 'unknown',
  periodEnd: null,
  error: null,
});

/** Assinatura libera o app? Ativa/trial e dentro do período pago. */
export function isActive(): boolean {
  const ok = subscription.status === 'active' || subscription.status === 'trialing';
  if (!ok) return false;
  if (subscription.periodEnd == null) return true;
  return subscription.periodEnd > Date.now();
}

/** Consulta o status na nuvem. Online obrigatório: falha de rede bloqueia. */
export async function fetchSubscription(): Promise<void> {
  if (!auth.user) return;
  subscription.loading = true;
  subscription.error = null;
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) {
    subscription.error = error.message;
    subscription.status = 'unknown';
    subscription.periodEnd = null;
    subscription.loading = false;
    return;
  }
  if (!data) {
    // Sem row = nunca assinou: trial automático de 7 dias desde o cadastro.
    subscription.status = 'trialing';
    subscription.periodEnd = trialEndFromUser();
    subscription.loading = false;
    return;
  }
  subscription.status = (data.status as SubStatus) ?? 'inactive';
  subscription.periodEnd = data.current_period_end
    ? new Date(data.current_period_end).getTime()
    : null;
  subscription.loading = false;
}

/** Está no período de teste grátis (ainda não assinou de fato). */
export function isTrial(): boolean {
  return subscription.status === 'trialing';
}

/** Dias restantes até periodEnd (0 se já passou ou sem data). */
export function daysLeft(): number {
  if (subscription.periodEnd == null) return 0;
  const ms = subscription.periodEnd - Date.now();
  return ms > 0 ? Math.ceil(ms / (24 * 60 * 60 * 1000)) : 0;
}

/** Rótulo em pt-BR para o status atual. */
export function statusLabel(): string {
  switch (subscription.status) {
    case 'active':
      return 'Ativa';
    case 'trialing':
      return 'Período de teste';
    case 'past_due':
      return 'Pagamento pendente';
    case 'canceled':
      return 'Cancelada';
    case 'inactive':
      return 'Inativa';
    default:
      return 'Desconhecido';
  }
}

/**
 * Cancela a assinatura no Mercado Pago (via Edge Function). O acesso costuma
 * valer até o fim do período já pago; o webhook atualiza o status depois.
 * Retorna mensagem de erro, ou null em sucesso (e refaz o fetch).
 */
export async function cancelSubscription(): Promise<string | null> {
  const { error } = await supabase.functions.invoke('mp-cancel-subscription', {
    body: {},
  });
  if (error) return error.message ?? 'falha ao cancelar a assinatura';
  await fetchSubscription();
  return null;
}

/** Limpa ao sair. */
export function resetSubscription(): void {
  subscription.loading = true;
  subscription.status = 'unknown';
  subscription.periodEnd = null;
  subscription.error = null;
}
