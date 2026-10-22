import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

/** Conexión a internet y nuevas versiones de la app (el menú se guarda para verse sin conexión). */
@Injectable({ providedIn: 'root' })
export class ConexionService {
  readonly enLinea = signal(navigator.onLine);
  /** Hay una versión nueva del menú lista para usar. */
  readonly versionNueva = signal(false);

  constructor() {
    const actualizar = () => this.enLinea.set(navigator.onLine);
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', actualizar);
      window.removeEventListener('offline', actualizar);
    });

    const sw = inject(SwUpdate);
    if (sw.isEnabled) {
      sw.versionUpdates.subscribe((e) => {
        if (e.type === 'VERSION_READY') this.versionNueva.set(true);
      });
      // Al volver a la pestaña (por ejemplo, el menú quedó abierto en el celular), busca cambios de precios.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) sw.checkForUpdate().catch(() => {});
      });
    }
  }

  recargar() {
    location.reload();
  }
}
