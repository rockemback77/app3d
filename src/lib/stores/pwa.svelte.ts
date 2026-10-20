import { registerSW } from 'virtual:pwa-register';

// Estado reativo do service worker + instalação (Svelte 5 runes).
export const pwa = $state({
  needRefresh: false,
  offlineReady: false,
  // install (Android/Chrome)
  canInstall: false,
  // iOS: sem beforeinstallprompt, mostramos instrução manual
  isIOS: false,
  isStandalone: false,
});

let updateSW: ((reload?: boolean) => Promise<void>) | null = null;
let deferredPrompt: any = null;

export function initPWA(): void {
  // detecção de plataforma / modo instalado
  const ua = navigator.userAgent || '';
  pwa.isIOS = /iphone|ipad|ipod/i.test(ua);
  pwa.isStandalone =
    (navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  // registro do service worker com fluxo de update por clique
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      pwa.needRefresh = true;
    },
    onOfflineReady() {
      pwa.offlineReady = true;
      setTimeout(() => (pwa.offlineReady = false), 4000);
    },
  });

  // captura do prompt de instalação (Android/Chrome)
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    pwa.canInstall = true;
  });

  window.addEventListener('appinstalled', () => {
    pwa.canInstall = false;
    deferredPrompt = null;
  });
}

/** Ativa a nova versão (skipWaiting) e recarrega — chamado no clique do usuário. */
export async function applyUpdate(): Promise<void> {
  if (updateSW) await updateSW(true);
}

export function dismissRefresh(): void {
  pwa.needRefresh = false;
}

/** Dispara o prompt nativo de instalação (Android/Chrome). */
export async function promptInstall(): Promise<void> {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  try {
    await deferredPrompt.userChoice;
  } finally {
    deferredPrompt = null;
    pwa.canInstall = false;
  }
}
