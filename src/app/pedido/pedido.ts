import type { Promocion } from '../config/modelo';
import type { Plato } from '../menu/menu.model';
import { formatoPrecio } from '../menu/precio';

/**
 * Pedido por WhatsApp. La página arma el mensaje y no cobra. Sin cuenta no guarda datos de nadie; con cuenta del
 * Club el pedido queda además en Firestore (club/sesion.ts) para sus sellos y para el panel.
 * Lo que se guarda en el navegador son ids (plato, variante, cantidad): los nombres y precios salen siempre del
 * menú vigente, así un pedido guardado nunca muestra un precio viejo.
 */

export type Variante = 'sola' | 'combo';
export type Entrega = 'domicilio' | 'recoger';

export type LineaGuardada =
  | { tipo: 'plato'; platoId: string; variante: Variante; /** Acompañamiento del combo. */ con?: string; cantidad: number }
  | { tipo: 'promo'; promoId: string; cantidad: number };

export interface Linea {
  clave: string;
  nombre: string;
  /** 'En combo · Papas a la francesa', 'Sola' o lo que trae la promo. */
  detalle: string;
  precio: number;
  cantidad: number;
  subtotal: number;
  guardada: LineaGuardada;
}

/** Máximo por línea: evita cantidades absurdas por un dedo pegado. */
export const MAXIMO = 20;

export function claveDe(l: LineaGuardada): string {
  return l.tipo === 'promo' ? `promo|${l.promoId}` : [l.platoId, l.variante, l.variante === 'combo' ? (l.con ?? '') : ''].join('|');
}

/** Suma `cantidad` a la línea igual (mismo plato, variante y acompañamiento) o la crea. Con cantidad 0 o menos, la quita. */
export function sumar(lineas: LineaGuardada[], nueva: LineaGuardada): LineaGuardada[] {
  const clave = claveDe(nueva);
  const existe = lineas.some((l) => claveDe(l) === clave);
  const resultado = existe
    ? lineas.map((l) => (claveDe(l) === clave ? { ...l, cantidad: Math.min(MAXIMO, l.cantidad + nueva.cantidad) } : l))
    : [...lineas, { ...nueva, cantidad: Math.min(MAXIMO, nueva.cantidad) }];
  return resultado.filter((l) => l.cantidad > 0);
}

/**
 * Convierte lo guardado en líneas con nombre y precio del menú de hoy. Se descarta lo que ya no existe:
 * un plato que salió de la carta o quedó agotado, un combo que ya no se ofrece o una promo vencida.
 */
export function resolver(
  guardadas: LineaGuardada[],
  plato: (id: string) => Plato | undefined,
  acompanamientos: string[],
  promo: Promocion | null,
): Linea[] {
  const lineas: Linea[] = [];
  for (const g of guardadas) {
    if (!(g.cantidad > 0)) continue;
    const cantidad = Math.min(MAXIMO, Math.floor(g.cantidad));
    if (g.tipo === 'promo') {
      if (!promo || promo.id !== g.promoId || !promo.precio) continue;
      lineas.push({ clave: claveDe(g), nombre: `${promo.etiqueta}: ${promo.titulo}`, detalle: promo.detalle ?? '', precio: promo.precio, cantidad, subtotal: promo.precio * cantidad, guardada: g });
      continue;
    }
    const p = plato(g.platoId);
    if (!p || p.estado === 'agotado') continue;
    if (g.variante === 'combo') {
      if (!p.precioCombo) continue;
      const con = acompanamientos.includes(g.con ?? '') ? g.con! : acompanamientos[0];
      const guardada = { ...g, con };
      lineas.push({ clave: claveDe(guardada), nombre: p.nombre, detalle: ['En combo', con].filter(Boolean).join(' · '), precio: p.precioCombo, cantidad, subtotal: p.precioCombo * cantidad, guardada });
    } else {
      lineas.push({ clave: claveDe(g), nombre: p.nombre, detalle: p.precioCombo ? 'Sola' : '', precio: p.precio, cantidad, subtotal: p.precio * cantidad, guardada: g });
    }
  }
  return lineas;
}

export function totalDe(lineas: Linea[]): number {
  return lineas.reduce((suma, l) => suma + l.subtotal, 0);
}

export function unidadesDe(lineas: Linea[]): number {
  return lineas.reduce((suma, l) => suma + l.cantidad, 0);
}

/** Lo que admite descuento (cupón o Club): todo menos las promos, que ya vienen con precio especial. */
export function baseDescontable(lineas: Linea[]): number {
  return totalDe(lineas.filter((l) => l.guardada.tipo !== 'promo'));
}

/** Descuento aplicado al pedido (uno solo: el cupón reemplaza al del Club). */
export interface Descuento {
  tipo: 'club' | 'cupon';
  /** 'Descuento del Club Rootfire (10 %)', 'Cupón HALLOWEEN10' */
  concepto: string;
  valor: number;
  cupon?: string;
}

/** Lo que se agrega al mensaje cuando hay descuento o quien pide tiene cuenta del Club. */
export interface ExtrasPedido {
  descuento?: Descuento | null;
  /** Quien pide, con su cuenta del Club: así el local sabe a quién sumarle el sello. */
  cliente?: { nombre: string; celular: string; direccion?: string } | null;
  /** Premio de la tarjeta de sellos que canjea en este pedido. */
  premio?: string | null;
}

/** '$ 28.000' con espacio normal: el de no separación de formatoPrecio se ve raro en algunos teclados de WhatsApp. */
const precio = (valor: number) => formatoPrecio(valor).replace(/ /g, ' ');

const ENTREGAS: Record<Entrega, string> = { domicilio: 'A domicilio', recoger: 'Paso a recogerlo en el local' };

/** Una nota de una sola línea, sin espacios de más. */
export const notaLimpia = (nota: string) => nota.replace(/\s+/g, ' ').trim();

/**
 * El mensaje de WhatsApp: una línea por producto, el total (en negrilla de WhatsApp), la entrega y la nota. Con
 * descuento van también el subtotal y el descuento; con cuenta del Club, quién pide y el premio que canjea.
 */
export function mensajePedido(lineas: Linea[], entrega: Entrega, nota = '', saludo = 'Hola, Rootfire.', extras: ExtrasPedido = {}): string {
  const productos = lineas.map((l) => `• ${l.cantidad} x ${l.nombre}${l.detalle ? ` (${l.detalle})` : ''}: ${precio(l.subtotal)}`);
  const limpia = notaLimpia(nota);
  const total = totalDe(lineas);
  const { descuento, cliente, premio } = extras;
  const direccion = entrega === 'domicilio' ? cliente?.direccion?.trim() : '';
  return [
    `${saludo} Quiero hacer este pedido:`,
    '',
    ...productos,
    ...(premio ? [`• Premio del Club: ${premio}`] : []),
    '',
    ...(descuento ? [`Subtotal: ${precio(total)}`, `${descuento.concepto}: -${precio(descuento.valor)}`] : []),
    `*Total: ${precio(total - (descuento?.valor ?? 0))}*`,
    `Entrega: ${ENTREGAS[entrega]}`,
    ...(direccion ? [`Dirección: ${direccion}`] : []),
    ...(limpia ? [`Nota: ${limpia}`] : []),
    ...(cliente ? ['', `Cliente del Club: ${cliente.nombre} · ${cliente.celular}`] : []),
  ].join('\n');
}

/**
 * Si en el pedido hay suficientes combos del plato de la promo como para armarla, cuánto se ahorra cambiándolos
 * por la promo (0 si no aplica o no sale más barato).
 */
export function ahorroConPromo(lineas: Linea[], promo: Promocion | null): number {
  if (!promo?.platoId || !promo.cantidad || !promo.precio) return 0;
  const combos = lineas.filter((l) => l.guardada.tipo === 'plato' && l.guardada.platoId === promo.platoId && l.guardada.variante === 'combo');
  const unidades = unidadesDe(combos);
  if (unidades < promo.cantidad) return 0;
  return Math.max(0, combos[0].precio * promo.cantidad - promo.precio);
}

/** Cambia `promo.cantidad` combos del plato de la promo por una promo. */
export function cambiarPorPromo(guardadas: LineaGuardada[], promo: Promocion): LineaGuardada[] {
  let faltan = promo.cantidad ?? 0;
  const resto = guardadas.map((l) => {
    if (faltan === 0 || l.tipo !== 'plato' || l.platoId !== promo.platoId || l.variante !== 'combo') return l;
    const quita = Math.min(faltan, l.cantidad);
    faltan -= quita;
    return { ...l, cantidad: l.cantidad - quita };
  });
  return sumar(resto, { tipo: 'promo', promoId: promo.id, cantidad: 1 });
}
