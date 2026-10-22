import type { Promocion } from '../config/modelo';
import type { Plato } from '../menu/menu.model';
import { formatoPrecio } from '../menu/precio';

/**
 * Pedido por WhatsApp. La página solo arma el mensaje: no cobra, no guarda datos de nadie y no hay cuentas.
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

/** '$ 28.000' con espacio normal: el de no separación de formatoPrecio se ve raro en algunos teclados de WhatsApp. */
const precio = (valor: number) => formatoPrecio(valor).replace(/ /g, ' ');

const ENTREGAS: Record<Entrega, string> = { domicilio: 'A domicilio', recoger: 'Paso a recogerlo en el local' };

/** El mensaje de WhatsApp: una línea por producto, el total (en negrilla de WhatsApp), la entrega y la nota. */
export function mensajePedido(lineas: Linea[], entrega: Entrega, nota = '', saludo = 'Hola, Rootfire.'): string {
  const productos = lineas.map((l) => `• ${l.cantidad} x ${l.nombre}${l.detalle ? ` (${l.detalle})` : ''}: ${precio(l.subtotal)}`);
  const limpia = nota.replace(/\s+/g, ' ').trim();
  return [
    `${saludo} Quiero hacer este pedido:`,
    '',
    ...productos,
    '',
    `*Total: ${precio(totalDe(lineas))}*`,
    `Entrega: ${ENTREGAS[entrega]}`,
    ...(limpia ? [`Nota: ${limpia}`] : []),
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
