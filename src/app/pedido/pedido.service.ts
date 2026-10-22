import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CLIENTE } from '../config/cliente';
import type { Plato } from '../menu/menu.model';
import { MenuService } from '../menu/menu.service';
import { NegocioService } from '../negocio/negocio.service';
import { PromoService } from '../negocio/promo.service';
import { fechaColombia } from '../negocio/promocion';
import { type Entrega, type LineaGuardada, type Variante, ahorroConPromo, cambiarPorPromo, mensajePedido, resolver, sumar, totalDe, unidadesDe } from './pedido';

const CLAVE = `${CLIENTE.id}:pedido`;

/** Lee el pedido guardado: solo vale el del mismo día (un pedido a medias de la semana pasada estorba más que ayuda). */
function leer(): LineaGuardada[] {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? 'null');
    return guardado?.dia === fechaColombia() && Array.isArray(guardado.lineas) ? guardado.lineas : [];
  } catch {
    return [];
  }
}

/**
 * El pedido que se está armando para enviarlo por WhatsApp. Vive en el navegador (sobrevive a recargar la
 * página el mismo día) y no guarda nada personal: la dirección y el pago se hablan en el chat.
 */
@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly menu = inject(MenuService);
  private readonly negocio = inject(NegocioService);
  private readonly promos = inject(PromoService);

  /** La página deja armar pedidos (WhatsApp activo y `pedidos` encendido en la config). */
  readonly activo = CLIENTE.contacto.whatsapp.activo && !!CLIENTE.contacto.whatsapp.numero && !!CLIENTE.contacto.whatsapp.pedidos;
  readonly acompanamientos = computed(() => this.menu.menu().acompanamientosCombo ?? []);

  private readonly guardadas = signal<LineaGuardada[]>(this.activo ? leer() : []);
  readonly lineas = computed(() => resolver(this.guardadas(), (id) => this.menu.plato(id), this.acompanamientos(), this.promos.promo()));
  readonly unidades = computed(() => unidadesDe(this.lineas()));
  readonly total = computed(() => totalDe(this.lineas()));

  readonly entrega = signal<Entrega>('domicilio');
  readonly nota = signal('');
  /** Ventana "Tu pedido". */
  readonly abierto = signal(false);
  /** Lo último que se agregó ("Ron & Bacon"): la barra del pedido lo anuncia. */
  readonly ultimo = signal('');

  readonly enlace = computed(() => (this.lineas().length ? this.negocio.whatsappCon(mensajePedido(this.lineas(), this.entrega(), this.nota())) : null));
  /** Lo que se ahorra cambiando los combos del plato de la promo por la promo (0 si no aplica). */
  readonly ahorroPromo = computed(() => ahorroConPromo(this.lineas(), this.promos.promo()));

  constructor() {
    effect(() => {
      const lineas = this.guardadas();
      if (!this.activo) return;
      try {
        if (lineas.length) localStorage.setItem(CLAVE, JSON.stringify({ dia: fechaColombia(), lineas }));
        else localStorage.removeItem(CLAVE);
      } catch {
        // Navegación privada o almacenamiento lleno: el pedido sigue en memoria mientras la página esté abierta.
      }
    });
  }

  agregarPlato(plato: Plato, variante: Variante, cantidad = 1, con?: string) {
    this.guardadas.update((l) => sumar(l, { tipo: 'plato', platoId: plato.id, variante, ...(variante === 'combo' ? { con: con ?? this.acompanamientos()[0] } : {}), cantidad }));
    this.ultimo.set(plato.nombre);
  }

  agregarPromo() {
    const promo = this.promos.promo();
    if (!promo) return;
    this.guardadas.update((l) => sumar(l, { tipo: 'promo', promoId: promo.id, cantidad: 1 }));
    this.ultimo.set(promo.etiqueta);
  }

  /** Suma o resta unidades a una línea (al llegar a cero se quita). */
  cambiar(clave: string, delta: number) {
    const linea = this.lineas().find((l) => l.clave === clave);
    if (linea) this.guardadas.update((l) => sumar(l, { ...linea.guardada, cantidad: delta }));
  }

  /** Unidades de un plato en el pedido, en cualquier variante (para la insignia de las listas). */
  cantidadDe(platoId: string): number {
    return this.lineas().reduce((suma, l) => suma + (l.guardada.tipo === 'plato' && l.guardada.platoId === platoId ? l.cantidad : 0), 0);
  }

  usarPromo() {
    const promo = this.promos.promo();
    if (promo && this.ahorroPromo() > 0) this.guardadas.update((l) => cambiarPorPromo(l, promo));
  }

  vaciar() {
    this.guardadas.set([]);
    this.nota.set('');
  }
}
