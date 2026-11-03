import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Sin zone.js: la app funciona con signals (menos peso y menos trabajo en el celular).
    provideZonelessChangeDetection(),
    // PWA: guarda la app y el menú para abrirlos sin conexión. Solo en producción.
    // El `?v=` obliga a reinstalar el service worker: el navegador solo lo cambia si cambia su dirección o un byte del
    // archivo, y ngsw-worker.js es idéntico mientras no cambie Angular. Un service worker se queda con los encabezados
    // con los que se instaló: el de antes del 2026-10-22 traía `connect-src 'self'` y bloqueaba la carta de Firestore y
    // la ventana de Google. Hay que subir el número si alguna vez el service worker necesita encabezados nuevos.
    provideServiceWorker('ngsw-worker.js?v=2', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
