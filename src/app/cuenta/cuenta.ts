import {
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { Timestamp, collection, deleteDoc, deleteField, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import type { Cliente, PedidoGuardado } from '../club/modelo';
import { CLIENTE } from '../config/cliente';
import { marcarSesion } from '../firebase/config';
import { auth, db } from '../firebase/sdk';

/** Lo que la persona escribe al registrarse o al cambiar sus datos. */
export interface DatosCliente {
  nombre: string;
  celular: string;
  cumpleanos?: string;
  direccion?: string;
  barrio?: string;
  promociones: boolean;
}

export interface PedidoConId extends PedidoGuardado {
  id: string;
}

export async function entrarConGoogle(): Promise<User> {
  const proveedor = new GoogleAuthProvider();
  proveedor.setCustomParameters({ prompt: 'select_account' });
  const { user } = await signInWithPopup(auth(), proveedor, browserPopupRedirectResolver);
  marcarSesion(true);
  return user;
}

export async function entrarConCorreo(correo: string, clave: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth(), correo.trim(), clave);
  marcarSesion(true);
  return user;
}

/** Crea la cuenta y manda el correo para verificarla (no es obligatorio para el Club, pero confirma que es suyo). */
export async function crearConCorreo(correo: string, clave: string): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth(), correo.trim(), clave);
  marcarSesion(true);
  void sendEmailVerification(user).catch(() => undefined);
  return user;
}

export function recordarClave(correo: string): Promise<void> {
  return sendPasswordResetEmail(auth(), correo.trim());
}

export function reenviarVerificacion(usuario: User): Promise<void> {
  return sendEmailVerification(usuario);
}

export async function salir(): Promise<void> {
  await signOut(auth());
  marcarSesion(false);
}

export async function leerCliente(uid: string): Promise<Cliente | null> {
  const perfil = await getDoc(doc(db(), 'clientes', uid));
  return perfil.exists() ? (perfil.data() as Cliente) : null;
}

/** ¿Esta cuenta entra al panel? (la dueña o una de `admins`). Solo para mostrar el enlace: lo que vale son las reglas. */
export async function esAdmin(usuario: User): Promise<boolean> {
  const correo = usuario.email?.toLowerCase();
  if (!correo || !usuario.emailVerified) return false;
  if (correo === CLIENTE.adminEmail.toLowerCase()) return true;
  try {
    return (await getDoc(doc(db(), 'admins', correo))).exists();
  } catch {
    return false;
  }
}

const opcional = (texto?: string) => texto?.trim() || undefined;

/**
 * Crea el perfil del Club con la autorización de tratamiento de datos (obligatoria para registrarse) y la de
 * promociones (opcional), cada una con su fecha: es la prueba que pide la Ley 1581.
 */
export function registrar(usuario: User, datos: DatosCliente): Promise<void> {
  const ahora = serverTimestamp();
  return setDoc(doc(db(), 'clientes', usuario.uid), {
    nombre: datos.nombre.trim(),
    celular: datos.celular,
    correo: usuario.email?.toLowerCase() ?? '',
    cumpleanos: opcional(datos.cumpleanos),
    direccion: opcional(datos.direccion),
    barrio: opcional(datos.barrio),
    autorizaciones: {
      datos: { version: CLIENTE.legal.version, fecha: ahora },
      promociones: { aceptada: datos.promociones, fecha: ahora },
    },
    sellos: 0,
    pedidosEntregados: 0,
    creadoEn: ahora,
    actualizadoEn: ahora,
  });
}

/** Cambia sus datos. La autorización de promociones solo se toca si cambió (así su fecha dice cuándo la dio o retiró). */
export function actualizar(uid: string, actual: Cliente, datos: DatosCliente): Promise<void> {
  const ahora = serverTimestamp();
  const cambios: Record<string, unknown> = {
    nombre: datos.nombre.trim(),
    celular: datos.celular,
    cumpleanos: opcional(datos.cumpleanos) ?? deleteField(),
    direccion: opcional(datos.direccion) ?? deleteField(),
    barrio: opcional(datos.barrio) ?? deleteField(),
    actualizadoEn: ahora,
  };
  if (datos.promociones !== actual.autorizaciones.promociones.aceptada) {
    cambios['autorizaciones.promociones'] = { aceptada: datos.promociones, fecha: ahora };
  }
  return updateDoc(doc(db(), 'clientes', uid), cambios);
}

export async function misPedidos(uid: string): Promise<PedidoConId[]> {
  const resultado = await getDocs(query(collection(db(), 'pedidos'), where('uid', '==', uid), orderBy('creadoEn', 'desc'), limit(30)));
  return resultado.docs.map((d) => ({ id: d.id, ...(d.data() as PedidoGuardado) }));
}

/** Todo lo que el Club tiene de la persona, en un archivo JSON (derecho de acceso). */
export async function copiaDeMisDatos(usuario: User): Promise<Blob> {
  const fecha = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : v);
  const limpiar = (o: unknown): unknown =>
    Array.isArray(o) ? o.map(limpiar) : o && typeof o === 'object' && !(o instanceof Timestamp) ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, limpiar(v)])) : fecha(o);
  const [perfil, pedidos] = await Promise.all([leerCliente(usuario.uid), misPedidos(usuario.uid)]);
  const datos = {
    responsable: CLIENTE.legal.razonSocial ?? CLIENTE.nombre,
    generado: new Date().toISOString(),
    cuenta: { correo: usuario.email, creada: usuario.metadata.creationTime, ultimoIngreso: usuario.metadata.lastSignInTime },
    perfil: limpiar(perfil),
    pedidos: limpiar(pedidos),
  };
  return new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
}

/**
 * Borra la cuenta: sus pedidos, su perfil y la cuenta de acceso. Si Firebase pide volver a entrar (por seguridad,
 * cuando la sesión es vieja), los datos ya quedan borrados y lanza el error para pedirle que entre y repita.
 */
export async function eliminarCuenta(usuario: User): Promise<void> {
  const pedidos = await getDocs(query(collection(db(), 'pedidos'), where('uid', '==', usuario.uid)));
  for (let i = 0; i < pedidos.docs.length; i += 400) {
    const lote = writeBatch(db());
    pedidos.docs.slice(i, i + 400).forEach((p) => lote.delete(p.ref));
    await lote.commit();
  }
  await deleteDoc(doc(db(), 'clientes', usuario.uid));
  await deleteUser(usuario);
  marcarSesion(false);
}

/** Quien entró pero decide no registrarse: se borra la cuenta de acceso para no quedarnos con su correo. */
export async function noRegistrarme(usuario: User): Promise<void> {
  try {
    await deleteUser(usuario);
  } catch {
    await signOut(auth());
  }
  marcarSesion(false);
}
