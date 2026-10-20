import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { initPWA } from './lib/stores/pwa.svelte';
import { requestPersistentStorage } from './lib/backup';
import { startSettingsPersistence, settings } from './lib/stores/settings.svelte';
import { seedCostItemsIfEmpty, seedFilamentsIfEmpty, seedExamplePieceIfEmpty } from './lib/db';
import { startAuth } from './lib/stores/auth.svelte';
import { syncOnLogin } from './lib/sync.svelte';

initPWA();
startSettingsPersistence();
void requestPersistentStorage();
void seedCostItemsIfEmpty();
void seedFilamentsIfEmpty();
void seedExamplePieceIfEmpty(settings);
startAuth(
  () => void syncOnLogin(),
  () => {}
);

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
