import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { cuponDe, motivoCupon, normalizarCodigo, valorCupon, valorDescuentoClub } from '../club/club';
import { ClubService } from '../club/club.service';
import type { Cupon } from '../club/modelo';
import { CLIENTE } from '../config/cliente';
import { leerDocumento } from '../firebase/rest';
import type { Plato } from '../menu/menu.model';
import { MenuService } from '../menu/menu.service';
import { formatoCelular } from '../negocio/contacto';
import { NegocioService } from '../negocio/negocio.service';
import { PromoService } from '../negocio/promo.service';
import { fechaColombia } from '../negocio/promocion';
import {
  type Descuento,
  type Entrega,
  type LineaGuardada,
  type Variante,
  ahorroConPromo,
  baseDescontable,
  cambiarPorPromo,
  mensajePedido,
  notaLimpia,
  resolver,
  sumar,
  totalDe,
  unidadesDe,
} from './pedido';

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
 * Con cuenta del Club se aplica su descuento, se puede canjear el premio de los sellos y, al enviarlo, el pedido
 * queda guardado en su cuenta. Los cupones valen con o sin cuenta (salvo los que son solo del Club).
 */
@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly menu = inject(MenuService);
  private readonly negocio = inject(NegocioService);
  private readonly promos = inject(PromoService);
  private readonly club = inject(ClubService);

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

  /** Lo que se ahorra cambiando los combos del plato de la promo por la promo (0 si no aplica). */
  readonly ahorroPromo = computed(() => ahorroConPromo(this.lineas(), this.promos.promo()));

  /** Cupón aplicado (se revisa otra vez con cada cambio del pedido: si deja de cumplir, no descuenta). */
  readonly cupon = signal<Cupon | null>(null);
  readonly errorCupon = signal('');
  readonly revisandoCupon = signal(false);
  private readonly base = computed(() => baseDescontable(this.lineas()));
  private readonly hoy = computed(() => fechaColombia(this.negocio.ahora()));
  /** Por qué el cupón aplicado no descuenta ahora (por ejemplo, ya no llega al mínimo), o null. */
  readonly avisoCupon = computed(() => {
    const cupon = this.cupon();
    return cupon ? motivoCupon(cupon, { hoy: this.hoy(), base: this.base(), registrado: !!this.club.cliente() }) : null;
  });
  /** Un solo descuento por pedido: el cupón, o si no hay, el del Club. */
  readonly descuento = computed<Descuento | null>(() => {
    const cupon = this.cupon();
    if (cupon && !this.avisoCupon()) return { tipo: 'cupon', concepto: `Cupón ${cupon.codigo}`, valor: valorCupon(cupon, this.base()), cupon: cupon.codigo };
    if (!this.club.cliente()) return null;
    const club = this.club.ajustes();
    const valor = valorDescuentoClub(club, { base: this.base(), sinPedidos: this.club.sinPedidos() });
    return valor ? { tipo: 'club', concepto: `Descuento ${club.nombre} (${club.descuento.porcentaje} %)`, valor } : null;
  });
  readonly totalAPagar = computed(() => this.total() - (this.descuento()?.valor ?? 0));

  /** Canjear el premio de la tarjeta de sellos en este pedido. */
  readonly usarPremio = signal(false);
  readonly premio = computed(() => (this.usarPremio() && this.club.premios() > 0 ? this.club.ajustes().sellos.premio : null));

  private readonly datosCliente = computed(() => {
    const c = this.club.cliente();
    return c ? { nombre: c.nombre, celular: formatoCelular(c.celular), direccion: [c.direccion, c.barrio].filter(Boolean).join(', ') } : null;
  });
  private readonly mensaje = computed(() =>
    mensajePedido(this.lineas(), this.entrega(), this.nota(), undefined, { descuento: this.descuento(), cliente: this.datosCliente(), premio: this.premio() }),
  );
  readonly enlace = computed(() => (this.lineas().length ? this.negocio.whatsappCon(this.mensaje()) : null));
  /** El último pedido que quedó guardado en la cuenta: tocar dos veces "Enviar" no lo guarda dos veces. */
  private guardado = '';

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
    this.usarPremio.set(false);
  }

  /** Revisa el código en Firestore (sin cargar Firebase) y, si vale para este pedido, lo aplica. */
  async aplicarCupon(texto: string) {
    this.errorCupon.set('');
    const codigo = normalizarCodigo(texto);
    if (!codigo) {
      this.errorCupon.set('Escribe el código tal como te llegó (letras y números).');
      return;
    }
    this.revisandoCupon.set(true);
    try {
      const cupon = cuponDe(await leerDocumento(`cupones/${codigo}`), codigo);
      if (!cupon) {
        this.errorCupon.set('No encontramos ese cupón. Revisa que esté bien escrito.');
        return;
      }
      const motivo = motivoCupon(cupon, { hoy: this.hoy(), base: this.base(), registrado: !!this.club.cliente() });
      if (motivo) {
        this.errorCupon.set(motivo);
        return;
      }
      if (cupon.unUso && (await this.club.cuponYaUsado(codigo))) {
        this.errorCupon.set('Ya usaste este cupón en otro pedido.');
        return;
      }
      this.cupon.set(cupon);
    } catch {
      this.errorCupon.set('No pudimos revisar el cupón. Revisa tu conexión e inténtalo otra vez.');
    } finally {
      this.revisandoCupon.set(false);
    }
  }

  quitarCupon() {
    this.cupon.set(null);
    this.errorCupon.set('');
  }

  /**
   * Al tocar "Enviar pedido por WhatsApp" (el chat abre igual): con cuenta del Club el pedido queda guardado en su
   * cuenta, para sus sellos y para que el local lo vea en el panel. Si no se puede guardar, el pedido sigue en el chat.
   */
  alEnviar() {
    const cliente = this.club.cliente();
    const mensaje = this.mensaje();
    if (!cliente || !this.lineas().length || mensaje === this.guardado) return;
    this.guardado = mensaje;
    const descuento = this.descuento();
    const cupon = this.cupon();
    const direccion = this.datosCliente()?.direccion;
    this.club
      .guardarPedido(
        {
          cliente: { nombre: cliente.nombre, celular: cliente.celular },
          lineas: this.lineas().map((l) => ({ nombre: l.nombre, detalle: l.detalle, cantidad: l.cantidad, precio: l.precio })),
          subtotal: this.total(),
          descuento: descuento ?? undefined,
          premio: this.premio() ?? undefined,
          total: this.totalAPagar(),
          entrega: this.entrega(),
          direccion: this.entrega() === 'domicilio' && direccion ? direccion : undefined,
          nota: notaLimpia(this.nota()) || undefined,
        },
        descuento?.tipo === 'cupon' && !!cupon?.unUso,
      )
      .then(() => {
        // Un cupón de un solo uso ya quedó gastado.
        if (descuento?.tipo === 'cupon' && cupon?.unUso) this.cupon.set(null);
      })
      .catch(() => (this.guardado = ''));
  }
}
