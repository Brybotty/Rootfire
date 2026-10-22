import type { Promocion } from '../config/modelo';
import { fechaColombia, marcaVista, promoVigente } from './promocion';

/** Fecha a partir de la hora de Colombia (UTC-5). */
const colombia = (fechaHora: string) => new Date(`${fechaHora}:00-05:00`);

const PROMO: Promocion = {
  id: 'halloween-2026',
  etiqueta: 'Promo de octubre',
  titulo: '2 Ron & Bacon',
  precio: 58900,
  vigencia: { desde: '2026-10-01', hasta: '2026-10-31' },
  afiche: { src: 'promos/halloween-2026.webp', ancho: 1080, alto: 1920, alt: 'Afiche' },
};

describe('promoción del mes', () => {
  it('la fecha es la de Colombia, no la del navegador', () => {
    // 03:00 UTC del 1 de noviembre todavía es 31 de octubre a las 10 p. m. en Colombia.
    expect(fechaColombia(new Date('2026-11-01T03:00:00Z'))).toBe('2026-10-31');
    expect(fechaColombia(new Date('2026-11-01T05:00:00Z'))).toBe('2026-11-01');
  });

  it('vale desde el primer día hasta el último, ambos incluidos', () => {
    expect(promoVigente([PROMO], colombia('2026-10-01T00:00'))).toBe(PROMO);
    expect(promoVigente([PROMO], colombia('2026-10-08T20:00'))).toBe(PROMO);
    expect(promoVigente([PROMO], colombia('2026-10-31T23:59'))).toBe(PROMO);
  });

  it('antes y después de sus fechas no sale', () => {
    expect(promoVigente([PROMO], colombia('2026-09-30T23:59'))).toBeNull();
    expect(promoVigente([PROMO], colombia('2026-11-01T00:00'))).toBeNull();
    expect(promoVigente([], colombia('2026-10-08T20:00'))).toBeNull();
  });

  it('apagada no sale, aunque esté en fechas', () => {
    expect(promoVigente([{ ...PROMO, activa: false }], colombia('2026-10-08T20:00'))).toBeNull();
  });

  it('con varias programadas sale la primera que esté en fechas', () => {
    const navidad: Promocion = { ...PROMO, id: 'navidad-2026', vigencia: { desde: '2026-12-01', hasta: '2026-12-31' } };
    const lista = [navidad, PROMO];
    expect(promoVigente(lista, colombia('2026-10-08T20:00'))).toBe(PROMO);
    expect(promoVigente(lista, colombia('2026-12-24T20:00'))).toBe(navidad);
    expect(promoVigente(lista, colombia('2026-11-15T20:00'))).toBeNull();
  });

  it('la marca de "ya la vio" cambia cada día y con cada promo', () => {
    expect(marcaVista(PROMO, colombia('2026-10-08T20:00'))).toBe('halloween-2026|2026-10-08');
    expect(marcaVista(PROMO, colombia('2026-10-09T00:10'))).toBe('halloween-2026|2026-10-09');
  });
});
