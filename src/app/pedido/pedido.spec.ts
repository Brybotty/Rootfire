import type { Promocion } from '../config/modelo';
import type { Plato } from '../menu/menu.model';
import { type LineaGuardada, MAXIMO, ahorroConPromo, cambiarPorPromo, claveDe, mensajePedido, resolver, sumar, totalDe, unidadesDe } from './pedido';

const plato = (id: string, nombre: string, precio: number, precioCombo?: number, estado?: Plato['estado']): Plato => ({
  id, nombre, precio, precioCombo, estado, categoriaId: 'x', descripcion: '', ingredientes: [], orden: 1,
});
const PLATOS = [
  plato('ron-y-bacon', 'Ron & Bacon', 25000, 32000),
  plato('la-casual', 'La Casual', 15000, 22000),
  plato('aritos-x5', 'Aritos de cebolla x5', 4000),
  plato('agotada', 'La Agotada', 10000, 17000, 'agotado'),
];
const buscar = (id: string) => PLATOS.find((p) => p.id === id);
const LADOS = ['Papas a la francesa', 'Aritos de cebolla x5'];
const PROMO: Promocion = {
  id: 'halloween-2026', etiqueta: 'Promo de octubre', titulo: '2 Ron & Bacon', precio: 58900, detalle: 'Son 2 combos: cada uno con papas y gaseosa.',
  platoId: 'ron-y-bacon', cantidad: 2, vigencia: { desde: '2026-10-01', hasta: '2026-10-31' },
  afiche: { src: 'promos/x.webp', ancho: 1080, alto: 1920, alt: 'Afiche' },
};
const combo = (cantidad: number, con = LADOS[0]): LineaGuardada => ({ tipo: 'plato', platoId: 'ron-y-bacon', variante: 'combo', con, cantidad });

describe('pedido: líneas', () => {
  it('suma a la línea igual y separa por variante y acompañamiento', () => {
    let lineas = sumar([], combo(1));
    lineas = sumar(lineas, combo(1));
    lineas = sumar(lineas, combo(1, LADOS[1]));
    lineas = sumar(lineas, { tipo: 'plato', platoId: 'ron-y-bacon', variante: 'sola', cantidad: 1 });
    expect(lineas.map((l) => [claveDe(l), l.cantidad])).toEqual([
      ['ron-y-bacon|combo|Papas a la francesa', 2],
      ['ron-y-bacon|combo|Aritos de cebolla x5', 1],
      ['ron-y-bacon|sola|', 1],
    ]);
  });

  it('restar hasta cero quita la línea y hay un máximo por línea', () => {
    expect(sumar(sumar([], combo(1)), combo(-1))).toEqual([]);
    expect(sumar(sumar([], combo(15)), combo(15))[0].cantidad).toBe(MAXIMO);
  });

  it('pone nombres y precios del menú de hoy', () => {
    const lineas = resolver([combo(2), { tipo: 'plato', platoId: 'la-casual', variante: 'sola', cantidad: 1 }, { tipo: 'plato', platoId: 'aritos-x5', variante: 'sola', cantidad: 3 }], buscar, LADOS, null);
    expect(lineas.map((l) => [l.nombre, l.detalle, l.subtotal])).toEqual([
      ['Ron & Bacon', 'En combo · Papas a la francesa', 64000],
      ['La Casual', 'Sola', 15000],
      ['Aritos de cebolla x5', '', 12000],
    ]);
    expect(totalDe(lineas)).toBe(91000);
    expect(unidadesDe(lineas)).toBe(6);
  });

  it('descarta lo que ya no se puede pedir: plato borrado, agotado, combo que no existe o promo vencida', () => {
    const guardadas: LineaGuardada[] = [
      { tipo: 'plato', platoId: 'ya-no-existe', variante: 'sola', cantidad: 1 },
      { tipo: 'plato', platoId: 'agotada', variante: 'sola', cantidad: 1 },
      { tipo: 'plato', platoId: 'aritos-x5', variante: 'combo', cantidad: 1 },
      { tipo: 'promo', promoId: 'halloween-2026', cantidad: 1 },
      { tipo: 'promo', promoId: 'otra', cantidad: 1 },
    ];
    expect(resolver(guardadas, buscar, LADOS, null)).toEqual([]);
    expect(resolver(guardadas, buscar, LADOS, PROMO).map((l) => l.nombre)).toEqual(['Promo de octubre: 2 Ron & Bacon']);
  });

  it('un acompañamiento que ya no se ofrece pasa al primero de la lista', () => {
    expect(resolver([combo(1, 'Yuca frita')], buscar, LADOS, null)[0].detalle).toBe('En combo · Papas a la francesa');
  });
});

describe('pedido: mensaje de WhatsApp', () => {
  it('lista los productos, el total, la entrega y la nota', () => {
    const lineas = resolver([{ tipo: 'promo', promoId: PROMO.id, cantidad: 1 }, { tipo: 'plato', platoId: 'la-casual', variante: 'sola', cantidad: 2 }], buscar, LADOS, PROMO);
    expect(mensajePedido(lineas, 'domicilio', '  sin   pepinillos \n por favor ')).toBe(
      [
        'Hola, Rootfire. Quiero hacer este pedido:',
        '',
        '• 1 x Promo de octubre: 2 Ron & Bacon (Son 2 combos: cada uno con papas y gaseosa.): $ 58.900',
        '• 2 x La Casual (Sola): $ 30.000',
        '',
        '*Total: $ 88.900*',
        'Entrega: A domicilio',
        'Nota: sin pepinillos por favor',
      ].join('\n'),
    );
  });

  it('sin nota no deja el renglón, y dice cuando se recoge', () => {
    const mensaje = mensajePedido(resolver([combo(1)], buscar, LADOS, null), 'recoger');
    expect(mensaje).toContain('Entrega: Paso a recogerlo en el local');
    expect(mensaje).not.toContain('Nota');
    expect(mensaje).not.toContain(' ');
  });
});

describe('pedido: sugerir la promo', () => {
  it('avisa cuánto se ahorra cuando hay combos suficientes del plato de la promo', () => {
    const lineas = (g: LineaGuardada[]) => resolver(g, buscar, LADOS, PROMO);
    expect(ahorroConPromo(lineas([combo(1)]), PROMO)).toBe(0);
    expect(ahorroConPromo(lineas([combo(1), combo(1, LADOS[1])]), PROMO)).toBe(5100);
    expect(ahorroConPromo(lineas([{ tipo: 'plato', platoId: 'ron-y-bacon', variante: 'sola', cantidad: 2 }]), PROMO)).toBe(0);
    expect(ahorroConPromo(lineas([combo(2)]), null)).toBe(0);
  });

  it('cambia dos combos por una promo y deja el resto', () => {
    const cambiado = cambiarPorPromo([combo(1), combo(2, LADOS[1]), { tipo: 'plato', platoId: 'la-casual', variante: 'sola', cantidad: 1 }], PROMO);
    expect(cambiado.map((l) => [claveDe(l), l.cantidad])).toEqual([
      ['ron-y-bacon|combo|Aritos de cebolla x5', 1],
      ['la-casual|sola|', 1],
      ['promo|halloween-2026', 1],
    ]);
  });
});
