import type { AjustesClub } from '../config/modelo';
import { formatoPrecio } from '../menu/precio';
import { soloDigitos } from '../negocio/contacto';
import type { Cupon, EstadoPedido } from './modelo';

/** Celular de Colombia: 10 dígitos que empiezan por 3 (acepta espacios, guiones y el +57). null si no lo es. */
export function celularValido(texto: string): string | null {
  const digitos = soloDigitos(texto);
  const numero = digitos.length === 12 && digitos.startsWith('57') ? digitos.slice(2) : digitos;
  return /^3\d{9}$/.test(numero) ? numero : null;
}

/** Premios que ya puede pedir con sus sellos. */
export function premiosDisponibles(sellos: number, meta: number): number {
  return meta > 0 ? Math.floor(Math.max(0, sellos) / meta) : 0;
}

/** Sellos de la tarjeta actual (los que pasan de un premio completo): 11 sellos con meta 8 → 3. */
export function sellosEnTarjeta(sellos: number, meta: number): number {
  return meta > 0 ? Math.max(0, sellos) % meta : 0;
}

/**
 * Cómo cambian los sellos y los pedidos entregados de un cliente cuando el admin cambia el estado de su pedido.
 * Entregado suma un sello (y si canjeó el premio, descuenta los sellos del premio); deshacer lo devuelve.
 */
export function cambioDeSellos(de: EstadoPedido, a: EstadoPedido, canjeo: boolean, meta: number): { sellos: number; entregados: number } {
  const valor = (estado: EstadoPedido) => (estado === 'entregado' ? { sellos: 1 - (canjeo ? meta : 0), entregados: 1 } : { sellos: 0, entregados: 0 });
  const antes = valor(de);
  const despues = valor(a);
  return { sellos: despues.sellos - antes.sellos, entregados: despues.entregados - antes.entregados };
}

/** Código de cupón como se guarda: mayúsculas, sin espacios. Vacío si no tiene forma de código. */
export function normalizarCodigo(texto: string): string {
  const codigo = texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toUpperCase();
  return /^[A-Z0-9-]{3,20}$/.test(codigo) ? codigo : '';
}

/** Un cupón leído de Firestore, revisado campo por campo (null si no tiene forma de cupón). */
export function cuponDe(datos: Record<string, unknown> | null, codigo: string): Cupon | null {
  if (!datos) return null;
  const { tipo, valor, minimo, desde, hasta, descripcion } = datos;
  if ((tipo !== 'porcentaje' && tipo !== 'valor') || typeof valor !== 'number' || valor <= 0) return null;
  if (typeof desde !== 'string' || typeof hasta !== 'string') return null;
  return {
    codigo,
    tipo,
    valor,
    descripcion: typeof descripcion === 'string' ? descripcion : '',
    minimo: typeof minimo === 'number' ? minimo : 0,
    desde,
    hasta,
    activo: datos['activo'] === true,
    soloClub: datos['soloClub'] === true,
    unUso: datos['unUso'] === true,
  };
}

/** Redondea al múltiplo de 100 más cercano (en caja nadie da vueltas de $50). */
export const aCien = (valor: number) => Math.round(valor / 100) * 100;

/** Cuánto descuenta un cupón sobre `base` (lo que no es promo). Nunca más que la base. */
export function valorCupon(cupon: Pick<Cupon, 'tipo' | 'valor'>, base: number): number {
  const valor = cupon.tipo === 'porcentaje' ? aCien((base * Math.min(100, cupon.valor)) / 100) : cupon.valor;
  return Math.max(0, Math.min(base, valor));
}

/** Por qué no se puede usar un cupón ahora, o null si se puede. */
export function motivoCupon(cupon: Cupon, condiciones: { hoy: string; base: number; registrado: boolean }): string | null {
  if (!cupon.activo || condiciones.hoy > cupon.hasta) return 'Este cupón ya no está vigente.';
  if (condiciones.hoy < cupon.desde) return `Este cupón vale desde el ${fechaCorta(cupon.desde)}.`;
  if ((cupon.soloClub || cupon.unUso) && !condiciones.registrado) return 'Este cupón es para clientes del Club: entra a tu cuenta para usarlo.';
  if (condiciones.base <= 0) return 'Este cupón no aplica sobre los productos en promoción.';
  if (cupon.minimo > 0 && condiciones.base < cupon.minimo) return `Este cupón pide un pedido mínimo de ${formatoPrecio(cupon.minimo)} (sin contar las promos).`;
  return null;
}

/**
 * Descuento del Club para un cliente registrado, o 0 si no aplica: Club y descuento encendidos, primer pedido si
 * así se configuró y pedido mínimo.
 */
export function valorDescuentoClub(club: AjustesClub, condiciones: { base: number; sinPedidos: boolean }): number {
  const d = club.descuento;
  if (!club.activo || !d.activo || d.porcentaje <= 0 || condiciones.base <= 0) return 0;
  if (d.soloPrimerPedido && !condiciones.sinPedidos) return 0;
  if (d.minimo > 0 && condiciones.base < d.minimo) return 0;
  return Math.min(condiciones.base, aCien((condiciones.base * d.porcentaje) / 100));
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** '2026-10-31' → '31 oct' */
export function fechaCorta(fecha: string): string {
  const [, mes, dia] = fecha.split('-').map(Number);
  return mes && dia ? `${dia} ${MESES[mes - 1]}` : fecha;
}
