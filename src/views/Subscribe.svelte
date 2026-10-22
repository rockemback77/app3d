<script lang="ts">
  import { subscription, fetchSubscription } from '../lib/stores/subscription.svelte';
  import { signOut } from '../lib/stores/auth.svelte';
  import { startCheckout } from '../lib/stores/checkout';

  let busy = $state(false);
  let assinando = $state(false);
  let erro = $state<string | null>(null);

  async function atualizar() {
    busy = true;
    await fetchSubscription();
    busy = false;
  }

  async function assinar() {
    assinando = true;
    erro = null;
    const msg = await startCheckout();
    // Sucesso redireciona a página; se voltou mensagem, deu erro.
    if (msg) {
      erro = msg;
      assinando = false;
    }
  }

  const offline = $derived(subscription.error != null);
</script>

<div class="flex min-h-screen flex-col items-center justify-center p-6">
  <div class="w-full max-w-sm">
    <div class="mb-8 text-center">
      <img src="./icone.png" alt="Printaê" class="mx-auto mb-3 h-20 w-20 object-contain" />
      <h1 class="bg-gradient-to-r from-violet-600 to-sky-500 bg-clip-text text-2xl font-extrabold text-transparent">Printaê</h1>
    </div>

    <div class="space-y-3 rounded-3xl bg-white/90 p-5 text-center shadow-xl shadow-slate-200/60 backdrop-blur dark:bg-slate-800/90 dark:shadow-black/30">
      {#if offline}
        <p class="font-semibold text-amber-600">Sem conexão</p>
        <p class="text-sm text-slate-500">
          Este app exige internet para validar sua assinatura. Conecte-se e tente de novo.
        </p>
      {:else}
        <p class="font-semibold text-slate-800 dark:text-slate-100">Assinatura necessária</p>
        <p class="text-sm text-slate-500">
          Sua assinatura não está ativa. Assine para liberar a calculadora e seus dados.
        </p>
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">R$ 19,90/mês</p>
        <button
          class="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 font-semibold text-white shadow-md shadow-emerald-500/30 transition-transform active:scale-95 disabled:opacity-50"
          disabled={assinando}
          onclick={assinar}
        >
          {assinando ? 'Abrindo checkout…' : 'Assinar'}
        </button>
        {#if erro}
          <p class="text-sm text-rose-600">{erro}</p>
        {/if}
      {/if}

      <button
        class="w-full rounded-xl border border-slate-300 py-2.5 font-semibold text-slate-700 transition-transform active:scale-95 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200"
        disabled={busy}
        onclick={atualizar}
      >
        {busy ? 'Verificando…' : 'Já assinei / Atualizar'}
      </button>

      <button class="w-full py-1 text-center text-sm text-slate-500 hover:text-sky-600" onclick={signOut}>
        Sair
      </button>
    </div>
  </div>
</div>
