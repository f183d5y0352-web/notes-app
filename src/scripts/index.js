// CSS imports
import '../styles/styles.css';

import App from './pages/app';

// PWA Install Prompt Handler
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (event) => {
  console.log('beforeinstallprompt event fired');
  event.preventDefault();
  deferredPrompt = event;
  
  // Show install prompt - bisa ditampilkan di UI button
  showInstallPrompt();
});

window.addEventListener('appinstalled', () => {
  console.log('✅ PWA berhasil diinstall');
  deferredPrompt = null;
});

function showInstallPrompt() {
  // Store for later use - bisa dipanggil dari button di UI
  window.pwaInstallPrompt = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response: ${outcome}`);
      deferredPrompt = null;
    }
  };
}

// Register Service Worker untuk PWA + Push Notification
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      console.log('✅ Service Worker berhasil didaftar:', registration);
    } catch (error) {
      console.error('❌ Gagal mendaftar Service Worker:', error);
    }
  });
} else {
  console.warn('⚠️ Service Worker tidak didukung oleh browser ini');
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });
  await app.renderPage();

  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });
});

