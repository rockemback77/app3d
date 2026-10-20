<script lang="ts">
  import { pwa, applyUpdate, dismissRefresh } from '../lib/stores/pwa.svelte';
</script>

{#if pwa.needRefresh}
  <div class="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-xl bg-slate-900 p-4 text-white shadow-lg ring-1 ring-sky-500/40">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="font-semibold">Nova versão disponível</p>
        <p class="text-sm text-slate-300">Atualize para pegar as últimas melhorias.</p>
      </div>
      <div class="flex shrink-0 gap-2">
        <button
          class="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:text-white"
          onclick={dismissRefresh}>Depois</button>
        <button
          class="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold hover:bg-sky-400"
          onclick={() => applyUpdate()}>Atualizar</button>
      </div>
    </div>
  </div>
{/if}

{#if pwa.offlineReady}
  <div class="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-md rounded-xl bg-emerald-600 p-3 text-center text-sm text-white shadow-lg">
    App pronto para uso offline ✓
  </div>
{/if}
