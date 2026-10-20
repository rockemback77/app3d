<script lang="ts">
  import { signIn, signUp, resetPassword } from '../lib/stores/auth.svelte';

  let email = $state('');
  let senha = $state('');
  let modo = $state<'login' | 'cadastro'>('login');
  let authMsg = $state('');
  let busy = $state(false);

  async function entrar() {
    authMsg = '';
    busy = true;
    const err = modo === 'login' ? await signIn(email, senha) : await signUp(email, senha);
    busy = false;
    if (err) {
      authMsg = traduzErro(err);
    } else {
      senha = '';
      if (modo === 'cadastro') authMsg = 'Conta criada. Se pedir confirmação por email, verifique sua caixa.';
    }
  }

  function traduzErro(msg: string): string {
    if (/invalid login credentials/i.test(msg)) return 'Email ou senha incorretos.';
    if (/already registered/i.test(msg)) return 'Email já cadastrado. Faça login.';
    if (/password should be at least/i.test(msg)) return 'Senha muito curta (mín. 6 caracteres).';
    if (/email not confirmed/i.test(msg)) return 'Confirme seu email pelo link enviado antes de entrar.';
    return msg;
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && email && senha && !busy) entrar();
  }

  async function recuperar() {
    if (!email) {
      authMsg = 'Digite seu email acima para receber o link de recuperação.';
      return;
    }
    busy = true;
    const err = await resetPassword(email);
    busy = false;
    authMsg = err ? traduzErro(err) : 'Enviamos um link de recuperação para seu email.';
  }
</script>

<div class="flex min-h-screen flex-col items-center justify-center p-6">
  <div class="w-full max-w-sm">
    <div class="mb-8 text-center">
      <div class="mb-2 text-5xl">🧮</div>
      <h1 class="text-2xl font-bold">Calculadora de Custo 3D</h1>
      <p class="mt-1 text-sm text-slate-500">
        {modo === 'login' ? 'Entre para acessar seus dados' : 'Crie sua conta'}
      </p>
    </div>

    <div class="space-y-2 rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-800">
      <input
        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        type="email"
        placeholder="Email"
        autocomplete="email"
        bind:value={email}
        onkeydown={onKey}
      />
      <input
        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        type="password"
        placeholder="Senha"
        autocomplete={modo === 'login' ? 'current-password' : 'new-password'}
        bind:value={senha}
        onkeydown={onKey}
      />
      <button
        class="w-full rounded-lg py-2.5 font-semibold text-white disabled:opacity-50 {modo === 'cadastro' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-sky-500 hover:bg-sky-400'}"
        disabled={busy || !email || !senha}
        onclick={entrar}
      >
        {busy ? 'Aguarde…' : modo === 'login' ? 'Entrar' : 'Criar conta'}
      </button>
      <button
        class="w-full py-1 text-center text-sm text-sky-600"
        onclick={() => {
          modo = modo === 'login' ? 'cadastro' : 'login';
          authMsg = '';
        }}
      >
        {modo === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
      </button>
      {#if modo === 'login'}
        <button class="w-full py-1 text-center text-xs text-slate-500 hover:text-sky-600" onclick={recuperar}>
          Esqueci minha senha
        </button>
      {/if}
      {#if authMsg}<p class="pt-1 text-center text-sm text-amber-600">{authMsg}</p>{/if}
    </div>
  </div>
</div>
