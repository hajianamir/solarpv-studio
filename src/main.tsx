import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import 'leaflet/dist/leaflet.css';
import { ErrorBoundary } from './components/ErrorBoundary';

declare const __SOLARPV_PRODUCTION__: boolean;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Service workers are production-only. In dev, an old worker can cache Vite's
// ephemeral /node_modules/.vite dependency URLs and serve stale optimizer output
// (for example a missing react-dom_client.js) after npm install or restart.
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  if (__SOLARPV_PRODUCTION__) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          const notifyWaitingUpdate = () => {
            if (registration.waiting && navigator.serviceWorker.controller) {
              window.dispatchEvent(new Event('solarpv-update-waiting'));
            }
          };
          notifyWaitingUpdate();
          registration.addEventListener('updatefound', () => {
            registration.installing?.addEventListener('statechange', notifyWaitingUpdate);
          });
        })
        .catch((err) => {
          // SW registration is non-blocking
          console.debug('[PWA] Service worker registration note:', err);
        });
    });
  } else {
    // Unregister workers left behind by older dev builds. They can keep serving
    // stale optimized modules until the controlled page is navigated away.
    const cleanupKey = 'solarpv-dev-sw-cleanup-reload';
    void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      if (registrations.length > 0) {
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if (navigator.serviceWorker.controller && sessionStorage.getItem(cleanupKey) !== '1') {
        sessionStorage.setItem(cleanupKey, '1');
        window.location.reload();
      } else if (!navigator.serviceWorker.controller) {
        sessionStorage.removeItem(cleanupKey);
      }
    }).catch((err) => {
      console.debug('[PWA] Could not clean up stale development service workers:', err);
    });
  }
}
