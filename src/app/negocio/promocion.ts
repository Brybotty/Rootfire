import type { Promocion } from '../config/modelo';
import { hoyColombia } from './horario';

/** 'AAAA-MM-DD' del día que es en Colombia, sin importar dónde esté quien mira. */
export function fechaColombia(ahora: Date = new Date()): string {
  return new Date(hoyColombia(ahora)).toISOString().slice(0, 10);
}

/** La promo, si hoy (en Colombia) cae dentro de sus fechas; si no, null: una promo vencida no se muestra. */
export function promoVigente(promo: Promocion | undefined, ahora: Date = new Date()): Promocion | null {
  if (!promo) return null;
  const hoy = fechaColombia(ahora);
  return hoy >= promo.vigencia.desde && hoy <= promo.vigencia.hasta ? promo : null;
}

/** Lo que guarda el navegador para no abrir sola la ventana más de una vez al día: 'halloween-2026|2026-10-08'. */
export function marcaVista(promo: Promocion, ahora: Date = new Date()): string {
  return `${promo.id}|${fechaColombia(ahora)}`;
}
