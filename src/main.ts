import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { initPWA } from './lib/stores/pwa.svelte';
import { requestPersistentStorage } from './lib/backup';
import { startSettingsPersistence } from './lib/stores/settings.svelte';

initPWA();
startSettingsPersistence();
void requestPersistentStorage();

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
