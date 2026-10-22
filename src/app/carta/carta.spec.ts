import type { AjustesClub } from '../config/modelo';
import type { Menu, Plato } from '../menu/menu.model';
import { type Carta, menuParaVer, normalizarCarta } from './carta';

const CLUB: AjustesClub = { activo: false, nombre: 'Club Rootfire', descuento: { activo: true, porcentaje: 10, soloPrimerPedido: true, minimo: 0 }, sellos: { activo: true, meta: 8, premio: 'Una La Clásica' } };
const plato = (id: string, categoriaId: string, precio: number, extra: Partial<Plato> = {}): Plato => ({ id, categoriaId, nombre: id, descripcion: '', ingredientes: [], precio, orden: 1, ...extra });
const MENU: Menu = {
  moneda: 'COP',
  rangosPrecio: [10000, 20000],
  adicionesDe: 'adiciones',
  categorias: [
    { id: 'hamburguesas', nombre: 'Hamburguesas', icono: 'hamburguesa', orden: 1 },
    { id: 'adiciones', nombre: 'Adiciones', icono: 'papas', orden: 2 },
    { id: 'postres', nombre: 'Postres', icono: 'postre', orden: 3 },
  ],
  platos: [
    plato('la-clasica', 'hamburguesas', 19000, { conAdiciones: true }),
    plato('la-sola', 'hamburguesas', 15000),
    plato('papas', 'adiciones', 4000, { orden: 1 }),
    plato('aritos', 'adiciones', 4000, { orden: 2, estado: 'agotado' }),
    plato('brownie', 'postres', 9000, { oculto: true }),
  ],
};
const RESPALDO: Carta = { menu: MENU, promociones: [], club: CLUB };

describe('carta: lo que llega de Firestore', () => {
  it('descarta lo que no tiene forma de plato y completa lo que falta', () => {
    const carta = normalizarCarta(
      { menu: { categorias: MENU.categorias, platos: [{ id: 'x', categoriaId: 'hamburguesas', nombre: 'X', precio: 1000 }, { nombre: 'Sin id ni precio' }] } },
      RESPALDO,
    )!;
    expect(carta.menu.platos.length).toBe(1);
    expect(carta.menu.platos[0].ingredientes).toEqual([]);
    expect(carta.menu.rangosPrecio).toEqual([10000, 20000]);
    expect(carta.club).toEqual(CLUB);
    expect(carta.promociones).toEqual([]);
  });

  it('sin categorías o sin menú no sirve (se queda la carta anterior)', () => {
    expect(normalizarCarta({ menu: { categorias: [], platos: [] } }, RESPALDO)).toBeNull();
    expect(normalizarCarta(null, RESPALDO)).toBeNull();
    expect(normalizarCarta({ promociones: [] }, RESPALDO)).toBeNull();
  });

  it('el Club toma lo que mandó el admin y acota los valores raros', () => {
    const carta = normalizarCarta({ menu: MENU, club: { activo: true, descuento: { porcentaje: 250 }, sellos: { meta: 0 } } }, RESPALDO)!;
    expect(carta.club.activo).toBeTrue();
    expect(carta.club.descuento.porcentaje).toBe(100);
    expect(carta.club.sellos.meta).toBe(8);
    expect(carta.club.nombre).toBe('Club Rootfire');
  });

  it('una promo sin afiche o sin fechas no pasa', () => {
    const buena = { id: 'navidad', etiqueta: 'Promo', titulo: 'Combo', vigencia: { desde: '2026-12-01', hasta: '2026-12-31' }, afiche: { src: 'x.webp', ancho: 1080, alto: 1920, alt: '' } };
    const carta = normalizarCarta({ menu: MENU, promociones: [buena, { ...buena, afiche: undefined }, { ...buena, vigencia: {} }] }, RESPALDO)!;
    expect(carta.promociones.map((p) => p.id)).toEqual(['navidad']);
  });
});

describe('carta: lo que se muestra', () => {
  const visto = menuParaVer(MENU);

  it('no muestra lo oculto ni las categorías que quedan vacías', () => {
    expect(visto.platos.map((p) => p.id)).not.toContain('brownie');
    expect(visto.categorias.map((c) => c.id)).toEqual(['hamburguesas', 'adiciones']);
  });

  it('las adiciones del detalle salen de su categoría, con su precio y sin las agotadas', () => {
    expect(visto.platos.find((p) => p.id === 'la-clasica')?.adicionales).toEqual([{ nombre: 'papas', precio: 4000 }]);
    expect(visto.platos.find((p) => p.id === 'la-sola')?.adicionales).toBeUndefined();
  });
});
