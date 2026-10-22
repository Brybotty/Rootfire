import { Injectable, computed, inject, signal } from '@angular/core';
import { CLIENTE } from '../config/cliente';
import { NegocioService } from './negocio.service';
import { marcaVista, promoVigente } from './promocion';

const CLAVE = `${CLIENTE.id}:promo`;

/** Promo del mes: si está vigente, si su ventana está abierta y si ya salió sola hoy en este navegador. */
@Injectable({ providedIn: 'root' })
export class PromoService {
  private readonly negocio = inject(NegocioService);
  /** Se revisa con el reloj del negocio: al pasar su última fecha deja de mostrarse sin tocar nada. */
  readonly promo = computed(() => promoVigente(CLIENTE.promocion, this.negocio.ahora()));
  readonly abierta = signal(false);

  abrir() {
    const promo = this.promo();
    if (!promo) return;
    this.abierta.set(true);
    try {
      localStorage.setItem(CLAVE, marcaVista(promo));
    } catch {
      // Navegación privada o almacenamiento bloqueado: la ventana volverá a salir en la próxima visita.
    }
  }

  cerrar() {
    this.abierta.set(false);
  }

  /** ¿La ventana ya salió hoy en este navegador? (Sola sale una vez al día; el botón del inicio la abre siempre.) */
  vistaHoy(): boolean {
    const promo = this.promo();
    if (!promo) return true;
    try {
      return localStorage.getItem(CLAVE) === marcaVista(promo);
    } catch {
      return false;
    }
  }
}
