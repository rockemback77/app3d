<script lang="ts">
  import TabBar from './components/TabBar.svelte';
  import InstallBanner from './components/InstallBanner.svelte';
  import UpdateToast from './components/UpdateToast.svelte';
  import Calculator from './views/Calculator.svelte';
  import Profiles from './views/Profiles.svelte';
  import CostItems from './views/CostItems.svelte';
  import Sales from './views/Sales.svelte';
  import History from './views/History.svelte';
  import Settings from './views/Settings.svelte';
  import Login from './views/Login.svelte';
  import ResetPassword from './views/ResetPassword.svelte';
  import { ui } from './lib/stores/ui.svelte';
  import { auth } from './lib/stores/auth.svelte';
</script>

{#if auth.loading}
  <div class="flex min-h-screen items-center justify-center text-slate-400">
    <span class="text-3xl">🖨️</span>
  </div>
{:else if auth.recovery}
  <ResetPassword />
{:else if !auth.user}
  <Login />
{:else}
  <div class="mx-auto min-h-screen max-w-md">
    <InstallBanner />

    <main>
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
      {:else if ui.tab === 'settings'}
        <Settings />
      {/if}
    </main>

    <UpdateToast />
    <TabBar />
  </div>
{/if}
