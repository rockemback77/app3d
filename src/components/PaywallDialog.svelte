<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { Sparkles } from 'lucide-svelte';
  import { paywall, closePaywall, assinarFromPaywall } from '../lib/stores/paywall.svelte';
</script>

{#if paywall.open}
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center p-6"
    role="dialog"
    aria-modal="true"
    transition:fade={{ duration: 120 }}
  >
    <button
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      aria-label="Fechar"
      onclick={closePaywall}
    ></button>
    <div
      class="relative w-full max-w-sm rounded-2xl border border-white/10 bg-slate-800 p-5 text-center shadow-2xl"
      transition:scale={{ duration: 150, start: 0.95 }}
    >
      <span class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-sky-500 text-white shadow-lg shadow-violet-500/30">
        <Sparkles size={28} />
      </span>
      <h2 class="text-lg font-bold text-slate-100">Recurso Pro</h2>
      <p class="mt-1 text-sm text-slate-300">
        {#if paywall.feature}
          Seu acesso acabou. Assine o Pro para {paywall.feature}.
        {:else}
          Seu período de teste acabou. Assine o Pro para voltar a usar o app.
        {/if}
      </p>
      <p class="mt-2 text-sm font-semibold text-slate-200">R$ 19,90/mês</p>
      {#if paywall.error}
        <p class="mt-2 text-xs text-rose-400">{paywall.error}</p>
      {/if}
      <div class="mt-5 flex flex-col gap-2">
        <button
          class="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition-transform active:scale-95 disabled:opacity-50"
          disabled={paywall.busy}
          onclick={assinarFromPaywall}
        >
          {paywall.busy ? 'Abrindo checkout…' : 'Assinar agora'}
        </button>
        <button
          class="w-full rounded-lg border border-white/10 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          onclick={closePaywall}
        >
          Agora não
        </button>
      </div>
    </div>
  </div>
{/if}
