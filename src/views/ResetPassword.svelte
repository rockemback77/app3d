<script lang="ts">
  import { updatePassword } from '../lib/stores/auth.svelte';

  let senha = $state('');
  let senha2 = $state('');
  let msg = $state('');
  let busy = $state(false);

  async function salvar() {
    msg = '';
    if (senha.length < 6) {
      msg = 'Senha muito curta (mín. 6 caracteres).';
      return;
    }
    if (senha !== senha2) {
      msg = 'As senhas não conferem.';
      return;
    }
    busy = true;
    const err = await updatePassword(senha);
    busy = false;
    if (err) msg = err;
    // sucesso: auth.recovery vira false e o app segue para a tela principal
  }
</script>

<div class="flex min-h-screen flex-col items-center justify-center p-6">
  <div class="w-full max-w-sm">
    <div class="mb-8 text-center">
      <div class="mb-2 text-5xl">🔑</div>
      <h1 class="text-2xl font-bold">Nova senha</h1>
      <p class="mt-1 text-sm text-slate-500">Defina sua nova senha de acesso</p>
    </div>

    <div class="space-y-2 glass p-5">
      <input
        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        type="password"
        placeholder="Nova senha"
        autocomplete="new-password"
        bind:value={senha}
      />
      <input
        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        type="password"
        placeholder="Repita a nova senha"
        autocomplete="new-password"
        bind:value={senha2}
      />
      <button
        class="w-full rounded-lg bg-sky-500 py-2.5 font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
        disabled={busy || !senha || !senha2}
        onclick={salvar}
      >
        {busy ? 'Salvando…' : 'Salvar nova senha'}
      </button>
      {#if msg}<p class="pt-1 text-center text-sm text-amber-600">{msg}</p>{/if}
    </div>
  </div>
</div>
