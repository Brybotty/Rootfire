import type { Promocion } from '../config/modelo';
import { hoyColombia } from './horario';

/** 'AAAA-MM-DD' del día que es en Colombia, sin importar dónde esté quien mira. */
export function fechaColombia(ahora: Date = new Date()): string {
  return new Date(hoyColombia(ahora)).toISOString().slice(0, 10);
}

/** ¿Está encendida y hoy (en Colombia) cae dentro de sus fechas? Una promo vencida no se muestra. */
export function estaVigente(promo: Promocion, ahora: Date = new Date()): boolean {
  const hoy = fechaColombia(ahora);
  return promo.activa !== false && hoy >= promo.vigencia.desde && hoy <= promo.vigencia.hasta;
}

/** La promo que sale hoy: la primera de la lista que está encendida y en fechas (o null). */
export function promoVigente(promos: Promocion[], ahora: Date = new Date()): Promocion | null {
  return promos.find((p) => estaVigente(p, ahora)) ?? null;
}

/** Lo que guarda el navegador para no abrir sola la ventana más de una vez al día: 'halloween-2026|2026-10-08'. */
export function marcaVista(promo: Promocion, ahora: Date = new Date()): string {
  return `${promo.id}|${fechaColombia(ahora)}`;
}
