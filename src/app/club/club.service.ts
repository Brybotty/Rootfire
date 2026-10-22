import { Injectable, computed, inject, signal } from '@angular/core';
import { CartaService } from '../carta/carta.service';
import { firebaseListo, haySesion } from '../firebase/config';
import { premiosDisponibles } from './club';
import type { Cliente } from './modelo';
import type { PedidoNuevo } from './sesion';

/**
 * El Club en el menú: sus ajustes (de la carta) y la cuenta de quien tiene sesión en este navegador. Registrarse es
 * opcional: sin sesión no se descarga nada de Firebase y el pedido funciona igual que siempre.
 */
@Injectable({ providedIn: 'root' })
export class ClubService {
  private readonly cartas = inject(CartaService);

  readonly ajustes = computed(() => this.cartas.carta().club);
  /** Club encendido por el admin (y con Firebase configurado, que es donde viven las cuentas). */
  readonly activo = computed(() => firebaseListo && this.ajustes().activo);
  /** Perfil de quien tiene sesión (null: nadie, o todavía está cargando). */
  readonly cliente = signal<Cliente | null>(null);
  readonly sinPedidos = signal(false);
  /** Premios de la tarjeta de sellos que ya puede pedir. */
  readonly premios = computed(() => {
    const cliente = this.cliente();
    const sellos = this.ajustes().sellos;
    return cliente && this.activo() && sellos.activo ? premiosDisponibles(cliente.sellos, sellos.meta) : 0;
  });

  /** Si en este navegador hay sesión del Club, trae el perfil (Firebase baja después de pintar el menú). */
  async iniciar() {
    if (!haySesion()) return;
    try {
      const { leerSesion } = await import('./sesion');
      const sesion = await leerSesion();
      this.cliente.set(sesion?.cliente ?? null);
      this.sinPedidos.set(sesion?.sinPedidos ?? false);
    } catch {
      // Sin conexión: el pedido sale por WhatsApp sin los beneficios.
    }
  }

  async cuponYaUsado(codigo: string): Promise<boolean> {
    const { cuponYaUsado } = await import('./sesion');
    return cuponYaUsado(codigo);
  }

  async guardarPedido(pedido: PedidoNuevo, cuponDeUnUso: boolean) {
    const { guardarPedido } = await import('./sesion');
    await guardarPedido(pedido, cuponDeUnUso);
    this.sinPedidos.set(false);
  }
}
