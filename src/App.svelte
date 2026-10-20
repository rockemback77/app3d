<script lang="ts">
  import TabBar, { type Tab } from './components/TabBar.svelte';
  import InstallBanner from './components/InstallBanner.svelte';
  import UpdateToast from './components/UpdateToast.svelte';
  import Calculator from './views/Calculator.svelte';
  import Profiles from './views/Profiles.svelte';
  import History from './views/History.svelte';
  import Settings from './views/Settings.svelte';

  let tab = $state<Tab>('calc');
</script>

<div class="mx-auto min-h-screen max-w-md">
  <InstallBanner />

  <main>
    {#if tab === 'calc'}
      <Calculator />
    {:else if tab === 'profiles'}
      <Profiles />
    {:else if tab === 'history'}
      <History />
    {:else if tab === 'settings'}
      <Settings />
    {/if}
  </main>

  <UpdateToast />
  <TabBar bind:current={tab} />
</div>
