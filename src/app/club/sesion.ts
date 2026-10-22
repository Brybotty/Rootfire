import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, where, writeBatch } from 'firebase/firestore/lite';
import { dbLigera as db, usuarioActual } from '../firebase/sdk-ligero';
import type { Cliente, PedidoGuardado } from './modelo';

/**
 * Lo que el menú necesita de la cuenta del Club. Se descarga con import() (trae las cuentas de Firebase y Firestore
 * lite) solo cuando en el navegador hay sesión: quien pide sin cuenta nunca lo baja.
 */

export interface Sesion {
  uid: string;
  /** null: entró pero no terminó de registrarse (no aceptó la política), así que no tiene beneficios. */
  cliente: Cliente | null;
  /** Todavía no tiene pedidos (enviados o entregados): para el descuento del primer pedido. */
  sinPedidos: boolean;
}

export async function leerSesion(): Promise<Sesion | null> {
  const usuario = await usuarioActual();
  if (!usuario) return null;
  const perfil = await getDoc(doc(db(), 'clientes', usuario.uid));
  if (!perfil.exists()) return { uid: usuario.uid, cliente: null, sinPedidos: true };
  const previos = await getDocs(query(collection(db(), 'pedidos'), where('uid', '==', usuario.uid), limit(10)));
  return {
    uid: usuario.uid,
    cliente: perfil.data() as Cliente,
    sinPedidos: !previos.docs.some((p) => (p.data() as PedidoGuardado).estado !== 'cancelado'),
  };
}

/** ¿Ya usó este cupón de un solo uso? */
export async function cuponYaUsado(codigo: string): Promise<boolean> {
  const usuario = await usuarioActual();
  if (!usuario) return false;
  return (await getDoc(doc(db(), 'cupones', codigo, 'usos', usuario.uid))).exists();
}

export type PedidoNuevo = Omit<PedidoGuardado, 'uid' | 'estado' | 'creadoEn' | 'cerradoEn'>;

/**
 * Guarda el pedido que se acaba de enviar por WhatsApp (para los sellos y el panel). Con un cupón de un solo uso
 * deja la marca de que ya lo usó, en la misma escritura: las reglas no aceptan el pedido sin ella.
 */
export async function guardarPedido(pedido: PedidoNuevo, cuponDeUnUso: boolean): Promise<void> {
  const usuario = await usuarioActual();
  if (!usuario) return;
  const lote = writeBatch(db());
  const ref = doc(collection(db(), 'pedidos'));
  lote.set(ref, { ...pedido, uid: usuario.uid, estado: 'enviado', creadoEn: serverTimestamp() });
  const cupon = pedido.descuento?.cupon;
  if (cupon && cuponDeUnUso) lote.set(doc(db(), 'cupones', cupon, 'usos', usuario.uid), { pedidoId: ref.id, fecha: serverTimestamp() });
  await lote.commit();
}
