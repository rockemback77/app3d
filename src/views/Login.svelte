<script lang="ts">
  import { signIn, signUp, resetPassword, signInWithGoogle } from '../lib/stores/auth.svelte';

  let email = $state('');
  let senha = $state('');
  let modo = $state<'login' | 'cadastro'>('login');
  let authMsg = $state('');
  let busy = $state(false);

  async function entrarGoogle() {
    authMsg = '';
    busy = true;
    const err = await signInWithGoogle();
    if (err) {
      authMsg = traduzErro(err);
      busy = false;
    }
    // sucesso: navegador redireciona pro Google; nao reseta busy
  }

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
      <div class="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-sky-500 text-4xl shadow-lg shadow-violet-500/30">🖨️</div>
      <h1 class="bg-gradient-to-r from-violet-600 to-sky-500 bg-clip-text text-2xl font-extrabold text-transparent">Calculadora de Custo 3D</h1>
      <p class="mt-1 text-sm text-slate-500">
        {modo === 'login' ? 'Entre para acessar seus dados' : 'Crie sua conta'}
      </p>
    </div>

    <div class="space-y-2 rounded-3xl bg-white/90 p-5 shadow-xl shadow-slate-200/60 backdrop-blur dark:bg-slate-800/90 dark:shadow-black/30">
      <button
        class="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 font-semibold text-slate-700 shadow-sm transition-transform active:scale-95 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        disabled={busy}
        onclick={entrarGoogle}
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        Entrar com Google
      </button>

      <div class="flex items-center gap-2 py-1 text-xs text-slate-400">
        <span class="h-px flex-1 bg-slate-200 dark:bg-slate-700"></span>
        ou
        <span class="h-px flex-1 bg-slate-200 dark:bg-slate-700"></span>
      </div>

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
        class="w-full rounded-xl py-2.5 font-semibold text-white shadow-md transition-transform active:scale-95 disabled:opacity-50 {modo === 'cadastro' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30' : 'bg-gradient-to-r from-violet-500 to-sky-500 shadow-violet-500/30'}"
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
