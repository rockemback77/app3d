import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { initPWA } from './lib/stores/pwa.svelte';
import { requestPersistentStorage } from './lib/backup';
import { startSettingsPersistence, settings } from './lib/stores/settings.svelte';
import { ensureDefaultCostItems, seedFilamentsIfEmpty, seedExamplePieceIfEmpty } from './lib/db';
import { startAuth } from './lib/stores/auth.svelte';
import { syncOnLogin } from './lib/sync.svelte';
import { fetchSubscription, resetSubscription } from './lib/stores/subscription.svelte';
import { initTheme } from './lib/stores/theme.svelte';

initTheme();
initPWA();
startSettingsPersistence();
void requestPersistentStorage();
void ensureDefaultCostItems();
void seedFilamentsIfEmpty();
void seedExamplePieceIfEmpty(settings);
startAuth(
  () => {
    void fetchSubscription();
    void syncOnLogin();
  },
  () => resetSubscription()
);

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
