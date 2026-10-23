<script lang="ts">
  import { Lock } from 'lucide-svelte';
  import { subscription } from '../lib/stores/subscription.svelte';
  import { requirePro } from '../lib/stores/paywall.svelte';

  // Mensagem conforme o motivo do bloqueio.
  const msg = $derived(
    subscription.status === 'past_due'
      ? 'Pagamento pendente — regularize para voltar a usar.'
      : subscription.status === 'canceled'
        ? 'Assinatura cancelada — você pode ver seus dados, mas não editar.'
        : subscription.status === 'trialing'
          ? 'Seu teste grátis acabou — você pode ver seus dados, mas não editar.'
          : 'Modo leitura — assine o Pro para voltar a usar o app.'
  );
</script>

<div class="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
  <Lock size={14} class="shrink-0" />
  <span class="min-w-0 flex-1">{msg}</span>
  <button
    class="shrink-0 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 text-xs font-semibold text-white shadow-sm"
    onclick={() => requirePro('voltar a usar o app')}
  >
    Assinar
  </button>
</div>
