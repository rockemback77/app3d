import { supabase } from '../supabase';
import { auth } from './auth.svelte';

type SubStatus = 'unknown' | 'inactive' | 'active' | 'trialing' | 'past_due' | 'canceled';

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
  subscription.status = (data?.status as SubStatus) ?? 'inactive';
  subscription.periodEnd = data?.current_period_end
    ? new Date(data.current_period_end).getTime()
    : null;
  subscription.loading = false;
}

/** Limpa ao sair. */
export function resetSubscription(): void {
  subscription.loading = true;
  subscription.status = 'unknown';
  subscription.periodEnd = null;
  subscription.error = null;
}
