import type { AjustesClub } from '../config/modelo';
import { cambioDeSellos, celularValido, cuponDe, motivoCupon, normalizarCodigo, premiosDisponibles, sellosEnTarjeta, valorCupon, valorDescuentoClub } from './club';
import type { Cupon } from './modelo';

const CLUB: AjustesClub = { activo: true, nombre: 'Club Rootfire', descuento: { activo: true, porcentaje: 10, soloPrimerPedido: true, minimo: 0 }, sellos: { activo: true, meta: 8, premio: 'Una La Clásica' } };
const CUPON: Cupon = { codigo: 'HALLOWEEN', descripcion: '', tipo: 'porcentaje', valor: 10, minimo: 0, desde: '2026-10-01', hasta: '2026-10-31', activo: true, soloClub: false, unUso: false };
const HOY = { hoy: '2026-10-22', base: 50000, registrado: false };

describe('Club: datos del cliente', () => {
  it('acepta celulares de Colombia escritos de cualquier forma', () => {
    expect(celularValido('305 908 3313')).toBe('3059083313');
    expect(celularValido('+57 305-908-3313')).toBe('3059083313');
    expect(celularValido('6025551234')).toBeNull();
    expect(celularValido('30590833')).toBeNull();
  });
});

describe('Club: sellos', () => {
  it('cuenta premios y los sellos de la tarjeta actual', () => {
    expect(premiosDisponibles(7, 8)).toBe(0);
    expect(premiosDisponibles(17, 8)).toBe(2);
    expect(sellosEnTarjeta(11, 8)).toBe(3);
    expect(premiosDisponibles(5, 0)).toBe(0);
  });

  it('entregado suma un sello; con premio, descuenta la meta; deshacer lo devuelve', () => {
    expect(cambioDeSellos('enviado', 'entregado', false, 8)).toEqual({ sellos: 1, entregados: 1 });
    expect(cambioDeSellos('enviado', 'entregado', true, 8)).toEqual({ sellos: -7, entregados: 1 });
    expect(cambioDeSellos('entregado', 'enviado', true, 8)).toEqual({ sellos: 7, entregados: -1 });
    expect(cambioDeSellos('enviado', 'cancelado', false, 8)).toEqual({ sellos: 0, entregados: 0 });
    expect(cambioDeSellos('entregado', 'cancelado', false, 8)).toEqual({ sellos: -1, entregados: -1 });
  });
});

describe('Club: descuento por registrarse', () => {
  it('en el primer pedido, redondeado a cientos', () => {
    expect(valorDescuentoClub(CLUB, { base: 47000, sinPedidos: true })).toBe(4700);
    expect(valorDescuentoClub(CLUB, { base: 47500, sinPedidos: true })).toBe(4800);
    expect(valorDescuentoClub(CLUB, { base: 47000, sinPedidos: false })).toBe(0);
  });

  it('en cada pedido si no es solo el primero, y respeta el mínimo', () => {
    const siempre = { ...CLUB, descuento: { ...CLUB.descuento, soloPrimerPedido: false, minimo: 30000 } };
    expect(valorDescuentoClub(siempre, { base: 47000, sinPedidos: false })).toBe(4700);
    expect(valorDescuentoClub(siempre, { base: 20000, sinPedidos: false })).toBe(0);
  });

  it('con el Club o el descuento apagados no hay descuento', () => {
    expect(valorDescuentoClub({ ...CLUB, activo: false }, { base: 47000, sinPedidos: true })).toBe(0);
    expect(valorDescuentoClub({ ...CLUB, descuento: { ...CLUB.descuento, activo: false } }, { base: 47000, sinPedidos: true })).toBe(0);
  });
});

describe('cupones', () => {
  it('el código se escribe como sea y se guarda en mayúsculas', () => {
    expect(normalizarCodigo(' halloween 10 ')).toBe('HALLOWEEN10');
    expect(normalizarCodigo('navidad-2026')).toBe('NAVIDAD-2026');
    expect(normalizarCodigo('x')).toBe('');
    expect(normalizarCodigo('¡gratis!')).toBe('');
  });

  it('descuenta el porcentaje o el valor, nunca más que la base', () => {
    expect(valorCupon({ tipo: 'porcentaje', valor: 10 }, 47000)).toBe(4700);
    expect(valorCupon({ tipo: 'valor', valor: 5000 }, 47000)).toBe(5000);
    expect(valorCupon({ tipo: 'valor', valor: 5000 }, 3000)).toBe(3000);
  });

  it('dice por qué no se puede usar', () => {
    expect(motivoCupon(CUPON, HOY)).toBeNull();
    expect(motivoCupon({ ...CUPON, activo: false }, HOY)).toContain('ya no está vigente');
    expect(motivoCupon(CUPON, { ...HOY, hoy: '2026-11-01' })).toContain('ya no está vigente');
    expect(motivoCupon(CUPON, { ...HOY, hoy: '2026-09-30' })).toContain('desde el 1 oct');
    expect(motivoCupon({ ...CUPON, soloClub: true }, HOY)).toContain('clientes del Club');
    expect(motivoCupon({ ...CUPON, unUso: true }, HOY)).toContain('clientes del Club');
    expect(motivoCupon({ ...CUPON, soloClub: true }, { ...HOY, registrado: true })).toBeNull();
    expect(motivoCupon(CUPON, { ...HOY, base: 0 })).toContain('promoción');
    expect(motivoCupon({ ...CUPON, minimo: 60000 }, HOY)).toContain('mínimo');
  });

  it('lee el cupón de Firestore campo por campo', () => {
    expect(cuponDe({ tipo: 'valor', valor: 5000, desde: '2026-10-01', hasta: '2026-10-31', activo: true }, 'CINCO')).toEqual({
      codigo: 'CINCO', tipo: 'valor', valor: 5000, descripcion: '', minimo: 0, desde: '2026-10-01', hasta: '2026-10-31', activo: true, soloClub: false, unUso: false,
    });
    expect(cuponDe({ tipo: 'regalo', valor: 5000, desde: 'a', hasta: 'b' }, 'X')).toBeNull();
    expect(cuponDe(null, 'X')).toBeNull();
  });
});
