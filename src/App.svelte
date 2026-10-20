<script lang="ts">
  import TabBar from './components/TabBar.svelte';
  import InstallBanner from './components/InstallBanner.svelte';
  import UpdateToast from './components/UpdateToast.svelte';
  import Calculator from './views/Calculator.svelte';
  import Profiles from './views/Profiles.svelte';
  import History from './views/History.svelte';
  import Settings from './views/Settings.svelte';
  import { ui } from './lib/stores/ui.svelte';
</script>

<div class="mx-auto min-h-screen max-w-md">
  <InstallBanner />

  <main>
    {#if ui.tab === 'calc'}
      <Calculator />
    {:else if ui.tab === 'profiles'}
      <Profiles />
    {:else if ui.tab === 'history'}
      <History />
    {:else if ui.tab === 'settings'}
      <Settings />
    {/if}
  </main>

  <UpdateToast />
  <TabBar />
</div>
