<script lang="ts">
  import { pwa, promptInstall } from '../lib/stores/pwa.svelte';

  const DISMISS_KEY = 'custo3d.installDismissed';
  let dismissed = $state(localStorage.getItem(DISMISS_KEY) === '1');

  function close() {
    dismissed = true;
    localStorage.setItem(DISMISS_KEY, '1');
  }

  // Mostra se: não instalado, não dispensado, e (Android pode instalar OU é iOS no Safari)
  let show = $derived(
    !pwa.isStandalone && !dismissed && (pwa.canInstall || pwa.isIOS)
  );
</script>

{#if show}
  <div class="mx-4 mt-3 rounded-xl bg-sky-50 p-3 text-sm ring-1 ring-sky-200 dark:bg-sky-950/40 dark:ring-sky-800">
    {#if pwa.canInstall}
      <div class="flex items-center justify-between gap-3">
        <p class="text-slate-700 dark:text-slate-200">
          Instale o app na tela inicial para usar offline.
        </p>
        <div class="flex shrink-0 gap-2">
          <button class="text-slate-500" onclick={close}>✕</button>
          <button
            class="rounded-lg bg-sky-500 px-3 py-1.5 font-semibold text-white hover:bg-sky-400"
            onclick={() => promptInstall()}>Instalar</button>
        </div>
      </div>
    {:else if pwa.isIOS}
      <div class="flex items-start justify-between gap-3">
        <p class="text-slate-700 dark:text-slate-200">
          Para instalar no iPhone/iPad: toque em <span class="font-semibold">Compartilhar</span>
          <span aria-hidden="true">⎙</span> e depois em
          <span class="font-semibold">“Adicionar à Tela de Início”</span>.
        </p>
        <button class="shrink-0 text-slate-500" onclick={close}>✕</button>
      </div>
    {/if}
  </div>
{/if}
