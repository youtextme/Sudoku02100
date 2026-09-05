// platform/pwa.js - install prompt + online/offline status + cache update.
// Game-agnostic. Safe to call even without a service worker present.

import { on } from './events.js';
import { emit } from './events.js';

let deferredPrompt = null;
let installed = false;

export function isStandalone() {
  return (
    globalThis.matchMedia &&
    (matchMedia('(display-mode: standalone)').matches ||
      matchMedia('(display-mode: fullscreen)').matches ||
      navigator.standalone === true)
  );
}

export function canInstall() {
  return !!deferredPrompt && !isStandalone();
}

export function captureInstallPrompt() {
  globalThis.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installed = false;
    emit('pwa:installable', { canInstall: true });
  });
}

export function triggerInstall() {
  if (!deferredPrompt) return Promise.reject(new Error('no-available'));
  deferredPrompt.prompt();
  return deferredPrompt.userChoice.then((choice) => {
    if (choice.outcome === 'accepted') {
      installed = true;
      emit('pwa:installed');
    }
    deferredPrompt = null;
  });
}

export function handleAppInstalled() {
  globalThis.addEventListener('appinstalled', () => {
    installed = true;
    emit('pwa:installed');
  });
}

export function monitorConnection() {
  const note = () => emit('pwa:conn', { online: navigator.onLine !== false });
  window.addEventListener('online', note);
  window.addEventListener('offline', note);
  note();
}

export function registerServiceWorker(cacheName, assets) {
  if (!('serviceWorker' in navigator)) return Promise.resolve(false);
  return navigator.serviceWorker.register('./sw.js').then((reg) => {
    on('pwa:needs-precache', () => {});
    return !!reg;
  }).catch((err) => {
    console.warn('[pwa] SW registration failed', err);
    return false;
  });
}