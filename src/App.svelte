<script lang="ts">
  import Menu from './components/Menu.svelte';
  import InstallBanner from './components/InstallBanner.svelte';
  import UpdateToast from './components/UpdateToast.svelte';
  import Calculator from './views/Calculator.svelte';
  import Profiles from './views/Profiles.svelte';
  import CostItems from './views/CostItems.svelte';
  import Sales from './views/Sales.svelte';
  import History from './views/History.svelte';
  import Stock from './views/Stock.svelte';
  import Inventory from './views/Inventory.svelte';
  import Settings from './views/Settings.svelte';
  import Login from './views/Login.svelte';
  import Landing from './views/Landing.svelte';
  import ResetPassword from './views/ResetPassword.svelte';
  import Subscribe from './views/Subscribe.svelte';
  import { ui } from './lib/stores/ui.svelte';
  import { auth } from './lib/stores/auth.svelte';
  import { subscription, isActive } from './lib/stores/subscription.svelte';

  // tela de entrada (deslogado): landing -> login/cadastro
  let showLogin = $state(false);
  let loginMode = $state<'login' | 'cadastro'>('login');
  function abrirLogin(modo: 'login' | 'cadastro') {
    loginMode = modo;
    showLogin = true;
  }
  // ao logar, zera o estado pra um logout futuro voltar à landing
  $effect(() => {
    if (auth.user) showLogin = false;
  });
</script>

{#if auth.loading}
  <div class="flex min-h-screen items-center justify-center">
    <img src="./icone.png" alt="" class="h-16 w-16 animate-pulse object-contain" />
  </div>
{:else if auth.recovery}
  <ResetPassword />
{:else if !auth.user}
  {#if showLogin}
    <Login initialMode={loginMode} onBack={() => (showLogin = false)} />
  {:else}
    <Landing onLogin={() => abrirLogin('login')} onSignup={() => abrirLogin('cadastro')} />
  {/if}
{:else if subscription.loading}
  <div class="flex min-h-screen items-center justify-center">
    <img src="./icone.png" alt="" class="h-16 w-16 animate-pulse object-contain" />
  </div>
{:else if !isActive()}
  <Subscribe />
{:else}
  <div class="min-h-screen md:flex">
    <Menu />
    <div class="min-w-0 flex-1">
      <InstallBanner />

      <main class="mx-auto max-w-md md:max-w-2xl">
        {#if ui.tab === 'calc'}
          <Calculator />
        {:else if ui.tab === 'profiles'}
          <Profiles />
        {:else if ui.tab === 'costs'}
          <CostItems />
        {:else if ui.tab === 'sales'}
          <Sales />
        {:else if ui.tab === 'history'}
          <History />
        {:else if ui.tab === 'stock'}
          <Stock />
        {:else if ui.tab === 'inventory'}
          <Inventory />
        {:else if ui.tab === 'settings'}
          <Settings />
        {/if}
      </main>

      <UpdateToast />
    </div>
  </div>
{/if}
