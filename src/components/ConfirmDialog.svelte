<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { confirmState, resolveConfirm } from '../lib/stores/confirm.svelte';

  const o = $derived(confirmState.opts);
</script>

{#if confirmState.open}
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center p-6"
    role="dialog"
    aria-modal="true"
    transition:fade={{ duration: 120 }}
  >
    <button
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      aria-label="Cancelar"
      onclick={() => resolveConfirm(false)}
    ></button>
    <div
      class="relative w-full max-w-sm rounded-2xl border border-white/10 bg-slate-800 p-5 shadow-2xl"
      transition:scale={{ duration: 150, start: 0.95 }}
    >
      {#if o.title}
        <h2 class="text-lg font-bold text-slate-100">{o.title}</h2>
      {/if}
      <p class="mt-1 text-sm text-slate-300">{o.message}</p>
      <div class="mt-5 flex gap-2">
        <button
          class="flex-1 rounded-lg bg-slate-700 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-600"
          onclick={() => resolveConfirm(false)}
        >
          {o.cancelLabel ?? 'Cancelar'}
        </button>
        <button
          class="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white {o.danger
            ? 'bg-red-500 hover:bg-red-400'
            : 'bg-sky-500 hover:bg-sky-400'}"
          onclick={() => resolveConfirm(true)}
        >
          {o.confirmLabel ?? 'Confirmar'}
        </button>
      </div>
    </div>
  </div>
{/if}
