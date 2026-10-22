// Pruebas de seguridad de firestore.rules. Cada caso intenta algo que la página hace (debe funcionar)
// o un abuso desde la consola del navegador (debe fallar).
//
// Uso: npm run test:reglas   (levanta el emulador de Firestore; no toca el proyecto real)
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-reglas-rootfire',
  firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
});
await env.clearFirestore();

// Debe coincidir con esAdmin() en firestore.rules (adminEmail de la config).
const PRINCIPAL = 'ortizgonzalesbryanalexander1@gmail.com';
const CORREOS = { admin: PRINCIPAL, socio: 'socio@x.com', ana: 'ana@x.com', beto: 'beto@x.com', nuevo: 'nuevo@x.com' };
const correoDe = (uid) => CORREOS[uid] ?? `${uid}@x.com`;
const db = (uid, extra = {}) => env.authenticatedContext(uid, { email: correoDe(uid), email_verified: true, ...extra }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

let ok = 0;
let fallos = 0;
async function caso(nombre, fn) {
  try {
    await fn();
    ok++;
    console.log('  ✔', nombre);
  } catch (e) {
    fallos++;
    console.log('  ✘', nombre, '\n     ', e.message.split('\n')[0]);
  }
}
const seccion = (t) => console.log(`\n${t}`);

// ---------------------------------------------------------------------------
// Estado inicial (sin reglas)
// ---------------------------------------------------------------------------
const AUT = (fecha = new Date()) => ({ datos: { version: '2026-10-22', fecha }, promociones: { aceptada: true, fecha } });
const perfil = (uid, extra = {}) => ({
  nombre: 'Ana Pérez', celular: '3001234567', correo: correoDe(uid), autorizaciones: AUT(), sellos: 0, pedidosEntregados: 0,
  creadoEn: new Date(), actualizadoEn: new Date(), ...extra,
});
await env.withSecurityRulesDisabled(async (ctx) => {
  const f = ctx.firestore();
  await setDoc(doc(f, 'publico/carta'), { menu: { categorias: [], platos: [] }, promociones: [], club: { activo: true, sellos: { activo: true, meta: 8 } } });
  await setDoc(doc(f, 'admins/socio@x.com'), { agregadoEn: new Date() });
  await setDoc(doc(f, 'clientes/ana'), perfil('ana'));
  await setDoc(doc(f, 'clientes/beto'), perfil('beto', { nombre: 'Beto', sellos: 9 }));
  await setDoc(doc(f, 'cupones/HALLOWEEN'), { descripcion: '10 %', tipo: 'porcentaje', valor: 10, minimo: 0, desde: '2026-10-01', hasta: '2026-10-31', activo: true, soloClub: false, unUso: false });
  await setDoc(doc(f, 'cupones/UNAVEZ'), { descripcion: '5 mil', tipo: 'valor', valor: 5000, minimo: 0, desde: '2026-10-01', hasta: '2026-12-31', activo: true, soloClub: true, unUso: true });
  await setDoc(doc(f, 'cupones/APAGADO'), { descripcion: '', tipo: 'valor', valor: 5000, minimo: 0, desde: '2026-10-01', hasta: '2026-12-31', activo: false, soloClub: false, unUso: false });
  await setDoc(doc(f, 'pedidos/de-beto'), { uid: 'beto', cliente: { nombre: 'Beto', celular: '3009998877' }, lineas: [{ nombre: 'X', detalle: '', cantidad: 1, precio: 1000 }], subtotal: 1000, total: 1000, entrega: 'recoger', estado: 'enviado', creadoEn: new Date() });
});

const LINEAS = [{ nombre: 'Ron & Bacon', detalle: 'En combo · Papas a la francesa', cantidad: 2, precio: 32000 }];
const pedido = (uid, extra = {}) => ({
  uid, cliente: { nombre: 'Ana Pérez', celular: '3001234567' }, lineas: LINEAS, subtotal: 64000, total: 64000, entrega: 'domicilio', estado: 'enviado',
  creadoEn: serverTimestamp(), ...extra,
});
const nuevoPerfil = (uid, extra = {}) => ({
  nombre: 'Nuevo Cliente', celular: '3105556677', correo: correoDe(uid),
  autorizaciones: { datos: { version: '2026-10-22', fecha: serverTimestamp() }, promociones: { aceptada: false, fecha: serverTimestamp() } },
  sellos: 0, pedidosEntregados: 0, creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp(), ...extra,
});

// ---------------------------------------------------------------------------
seccion('Carta pública');
await caso('cualquiera lee la carta', () => assertSucceeds(getDoc(doc(anon(), 'publico/carta'))));
await caso('un visitante no la cambia', () => assertFails(setDoc(doc(anon(), 'publico/carta'), { menu: {} })));
await caso('un cliente no la cambia', () => assertFails(updateDoc(doc(db('ana'), 'publico/carta'), { 'club.activo': false })));
await caso('la cuenta principal la publica', () => assertSucceeds(updateDoc(doc(db('admin'), 'publico/carta'), { actualizadaEn: serverTimestamp() })));
await caso('un admin de la lista la publica', () => assertSucceeds(updateDoc(doc(db('socio'), 'publico/carta'), { actualizadaEn: serverTimestamp() })));
await caso('la cuenta principal sin correo verificado no entra', () =>
  assertFails(updateDoc(doc(db('admin', { email_verified: false }), 'publico/carta'), { actualizadaEn: serverTimestamp() })));
await caso('alguien con el correo de un admin pero sin verificar no entra', () =>
  assertFails(updateDoc(doc(db('falso', { email: 'socio@x.com', email_verified: false }), 'publico/carta'), { actualizadaEn: serverTimestamp() })));

// ---------------------------------------------------------------------------
seccion('Admins');
await caso('cada quien ve si su propio correo está en la lista', () => assertSucceeds(getDoc(doc(db('socio'), 'admins/socio@x.com'))));
await caso('un cliente no lista los admins', () => assertFails(getDocs(collection(db('ana'), 'admins'))));
await caso('un cliente no se agrega como admin', () => assertFails(setDoc(doc(db('ana'), 'admins/ana@x.com'), { agregadoEn: serverTimestamp() })));
await caso('un admin agrega a otro', () => assertSucceeds(setDoc(doc(db('admin'), 'admins/nuevo@x.com'), { agregadoEn: serverTimestamp() })));
await caso('con el correo en mayúsculas no (se guardan en minúsculas)', () => assertFails(setDoc(doc(db('admin'), 'admins/Otro@x.com'), { agregadoEn: serverTimestamp() })));
await caso('un admin quita a otro', () => assertSucceeds(deleteDoc(doc(db('admin'), 'admins/nuevo@x.com'))));

// ---------------------------------------------------------------------------
seccion('Clientes: registro');
await caso('se registra con su autorización y la fecha del servidor', () => assertSucceeds(setDoc(doc(db('nuevo'), 'clientes/nuevo'), nuevoPerfil('nuevo'))));
await caso('sin la autorización de datos no se registra', () =>
  assertFails(setDoc(doc(db('c2'), 'clientes/c2'), nuevoPerfil('c2', { autorizaciones: { promociones: { aceptada: false, fecha: serverTimestamp() } } }))));
await caso('con una fecha de autorización inventada no', () =>
  assertFails(setDoc(doc(db('c3'), 'clientes/c3'), nuevoPerfil('c3', { autorizaciones: { datos: { version: 'x', fecha: new Date(2020, 1, 1) }, promociones: { aceptada: false, fecha: serverTimestamp() } } }))));
await caso('no se regala sellos al registrarse', () => assertFails(setDoc(doc(db('c4'), 'clientes/c4'), nuevoPerfil('c4', { sellos: 50 }))));
await caso('no registra el perfil de otra cuenta', () => assertFails(setDoc(doc(db('c5'), 'clientes/otro'), nuevoPerfil('c5'))));
await caso('no pone un correo que no es el de su cuenta', () => assertFails(setDoc(doc(db('c6'), 'clientes/c6'), nuevoPerfil('c6', { correo: 'otro@x.com' }))));
await caso('el celular debe ser de Colombia (10 dígitos, empieza por 3)', () => assertFails(setDoc(doc(db('c7'), 'clientes/c7'), nuevoPerfil('c7', { celular: '12345' }))));
await caso('no agrega campos que no existen', () => assertFails(setDoc(doc(db('c8'), 'clientes/c8'), nuevoPerfil('c8', { rol: 'admin' }))));
await caso('un cumpleaños con forma rara no', () => assertFails(setDoc(doc(db('c9'), 'clientes/c9'), nuevoPerfil('c9', { cumpleanos: '13-45' }))));
await caso('con cumpleaños MM-DD sí', () => assertSucceeds(setDoc(doc(db('c10'), 'clientes/c10'), nuevoPerfil('c10', { cumpleanos: '12-24', direccion: 'Calle 1 # 2-3', barrio: 'Centro' }))));

seccion('Clientes: lectura y cambios');
await caso('ve su propio perfil', () => assertSucceeds(getDoc(doc(db('ana'), 'clientes/ana'))));
await caso('no ve el perfil de otro cliente', () => assertFails(getDoc(doc(db('ana'), 'clientes/beto'))));
await caso('un visitante no lista clientes', () => assertFails(getDocs(collection(anon(), 'clientes'))));
await caso('un cliente no lista clientes', () => assertFails(getDocs(collection(db('ana'), 'clientes'))));
await caso('el admin lista clientes', () => assertSucceeds(getDocs(collection(db('admin'), 'clientes'))));
await caso('cambia sus datos', () => assertSucceeds(updateDoc(doc(db('ana'), 'clientes/ana'), { nombre: 'Ana P.', direccion: 'Cra 5', actualizadoEn: serverTimestamp() })));
await caso('borra un dato opcional', () => assertSucceeds(updateDoc(doc(db('ana'), 'clientes/ana'), { direccion: deleteField(), actualizadoEn: serverTimestamp() })));
await caso('retira su autorización de promociones (con la fecha de hoy)', () =>
  assertSucceeds(updateDoc(doc(db('ana'), 'clientes/ana'), { 'autorizaciones.promociones': { aceptada: false, fecha: serverTimestamp() }, actualizadoEn: serverTimestamp() })));
await caso('no cambia la prueba de su autorización de datos', () =>
  assertFails(updateDoc(doc(db('ana'), 'clientes/ana'), { 'autorizaciones.datos': { version: 'otra', fecha: serverTimestamp() }, actualizadoEn: serverTimestamp() })));
await caso('no se suma sellos', () => assertFails(updateDoc(doc(db('ana'), 'clientes/ana'), { sellos: increment(5), actualizadoEn: serverTimestamp() })));
await caso('no cambia su correo', () => assertFails(updateDoc(doc(db('ana'), 'clientes/ana'), { correo: 'otro@x.com', actualizadoEn: serverTimestamp() })));
await caso('no cambia los datos de otro', () => assertFails(updateDoc(doc(db('ana'), 'clientes/beto'), { nombre: 'Hackeado', actualizadoEn: serverTimestamp() })));
await caso('el admin suma un sello', () => assertSucceeds(updateDoc(doc(db('admin'), 'clientes/ana'), { sellos: increment(1) })));
await caso('el admin no deja sellos negativos', () => assertFails(updateDoc(doc(db('admin'), 'clientes/ana'), { sellos: increment(-5) })));
await caso('el admin no toca la autorización de nadie', () =>
  assertFails(updateDoc(doc(db('admin'), 'clientes/ana'), { 'autorizaciones.promociones': { aceptada: true, fecha: serverTimestamp() } })));

// ---------------------------------------------------------------------------
seccion('Pedidos');
await caso('un cliente registrado guarda su pedido', () => assertSucceeds(setDoc(doc(db('ana'), 'pedidos/p1'), pedido('ana'))));
await caso('con el descuento del Club', () =>
  assertSucceeds(setDoc(doc(db('ana'), 'pedidos/p2'), pedido('ana', { descuento: { tipo: 'club', concepto: 'Descuento Club (10 %)', valor: 6400 }, total: 57600 }))));
await caso('el total debe ser el subtotal menos el descuento', () =>
  assertFails(setDoc(doc(db('ana'), 'pedidos/p3'), pedido('ana', { descuento: { tipo: 'club', concepto: 'x', valor: 6400 }, total: 100 }))));
await caso('el descuento no puede pasar del subtotal', () =>
  assertFails(setDoc(doc(db('ana'), 'pedidos/p4'), pedido('ana', { descuento: { tipo: 'club', concepto: 'x', valor: 90000 }, total: -26000 }))));
await caso('quien no está registrado no guarda pedidos', () => assertFails(setDoc(doc(db('sinperfil'), 'pedidos/p5'), pedido('sinperfil'))));
await caso('un visitante no guarda pedidos', () => assertFails(setDoc(doc(anon(), 'pedidos/p6'), pedido('ana'))));
await caso('no guarda un pedido a nombre de otro', () => assertFails(setDoc(doc(db('ana'), 'pedidos/p7'), pedido('beto'))));
await caso('no lo crea ya entregado', () => assertFails(setDoc(doc(db('ana'), 'pedidos/p8'), pedido('ana', { estado: 'entregado' }))));
await caso('con un cupón activo', () =>
  assertSucceeds(setDoc(doc(db('ana'), 'pedidos/p9'), pedido('ana', { descuento: { tipo: 'cupon', concepto: 'Cupón HALLOWEEN', valor: 6400, cupon: 'HALLOWEEN' }, total: 57600 }))));
await caso('con un cupón apagado no', () =>
  assertFails(setDoc(doc(db('ana'), 'pedidos/p10'), pedido('ana', { descuento: { tipo: 'cupon', concepto: 'x', valor: 5000, cupon: 'APAGADO' }, total: 59000 }))));
await caso('con un cupón que no existe no', () =>
  assertFails(setDoc(doc(db('ana'), 'pedidos/p11'), pedido('ana', { descuento: { tipo: 'cupon', concepto: 'x', valor: 5000, cupon: 'INVENTADO' }, total: 59000 }))));

const conCuponUnUso = (f, uid, id) => {
  const lote = writeBatch(f);
  lote.set(doc(f, `pedidos/${id}`), pedido(uid, { descuento: { tipo: 'cupon', concepto: 'Cupón UNAVEZ', valor: 5000, cupon: 'UNAVEZ' }, total: 59000 }));
  lote.set(doc(f, `cupones/UNAVEZ/usos/${uid}`), { pedidoId: id, fecha: serverTimestamp() });
  return lote.commit();
};
await caso('un cupón de un solo uso sin la marca de uso no', () =>
  assertFails(setDoc(doc(db('ana'), 'pedidos/p12'), pedido('ana', { descuento: { tipo: 'cupon', concepto: 'x', valor: 5000, cupon: 'UNAVEZ' }, total: 59000 }))));
await caso('un cupón de un solo uso con su marca, la primera vez', () => assertSucceeds(conCuponUnUso(db('ana'), 'ana', 'p13')));
await caso('el mismo cupón de un solo uso, la segunda vez no', () => assertFails(conCuponUnUso(db('ana'), 'ana', 'p14')));
await caso('no se puede gastar la marca de uso de otro', () =>
  assertFails(setDoc(doc(db('ana'), 'cupones/UNAVEZ/usos/beto'), { pedidoId: 'p13', fecha: serverTimestamp() })));
await caso('no se borra la marca de uso para repetir', () => assertFails(deleteDoc(doc(db('ana'), 'cupones/UNAVEZ/usos/ana'))));
await caso('ve si ya usó un cupón', () => assertSucceeds(getDoc(doc(db('ana'), 'cupones/UNAVEZ/usos/ana'))));

await caso('canjea el premio con los sellos de la meta', () => assertSucceeds(setDoc(doc(db('beto'), 'pedidos/p15'), pedido('beto', { premio: 'Una La Clásica' }))));
await caso('sin los sellos de la meta no canjea', () => assertFails(setDoc(doc(db('ana'), 'pedidos/p16'), pedido('ana', { premio: 'Una La Clásica' }))));

await caso('ve sus pedidos', () => assertSucceeds(getDocs(query(collection(db('ana'), 'pedidos'), where('uid', '==', 'ana')))));
await caso('no ve los pedidos de otros', () => assertFails(getDoc(doc(db('ana'), 'pedidos/de-beto'))));
await caso('no lista todos los pedidos', () => assertFails(getDocs(collection(db('ana'), 'pedidos'))));
await caso('no marca su pedido como entregado', () => assertFails(updateDoc(doc(db('ana'), 'pedidos/p1'), { estado: 'entregado' })));
await caso('el admin lo marca entregado y le suma el sello', async () => {
  const f = db('admin');
  const lote = writeBatch(f);
  lote.update(doc(f, 'pedidos/p1'), { estado: 'entregado', cerradoEn: serverTimestamp() });
  lote.update(doc(f, 'clientes/ana'), { sellos: increment(1), pedidosEntregados: increment(1), ultimoPedidoEn: serverTimestamp() });
  await assertSucceeds(lote.commit());
});
await caso('el admin no cambia los productos ni el total de un pedido', () => assertFails(updateDoc(doc(db('admin'), 'pedidos/p1'), { total: 1 })));
await caso('el admin no pone un estado inventado', () => assertFails(updateDoc(doc(db('admin'), 'pedidos/p1'), { estado: 'perdido' })));

// ---------------------------------------------------------------------------
seccion('Cupones');
await caso('cualquiera lee un cupón si sabe el código', () => assertSucceeds(getDoc(doc(anon(), 'cupones/HALLOWEEN'))));
await caso('nadie los lista sin ser admin', () => assertFails(getDocs(collection(db('ana'), 'cupones'))));
await caso('el admin los lista', () => assertSucceeds(getDocs(collection(db('admin'), 'cupones'))));
await caso('un cliente no crea cupones', () =>
  assertFails(setDoc(doc(db('ana'), 'cupones/GRATIS'), { descripcion: '', tipo: 'porcentaje', valor: 100, minimo: 0, desde: '2026-01-01', hasta: '2030-01-01', activo: true, soloClub: false, unUso: false })));
await caso('el admin crea un cupón', () =>
  assertSucceeds(setDoc(doc(db('admin'), 'cupones/NAVIDAD'), { descripcion: 'Navidad', tipo: 'porcentaje', valor: 15, minimo: 30000, desde: '2026-12-01', hasta: '2026-12-31', activo: true, soloClub: true, unUso: true })));
await caso('un porcentaje de más de 100 no', () =>
  assertFails(setDoc(doc(db('admin'), 'cupones/MAL'), { descripcion: '', tipo: 'porcentaje', valor: 150, minimo: 0, desde: '2026-12-01', hasta: '2026-12-31', activo: true, soloClub: false, unUso: false })));
await caso('un código en minúsculas no (se guardan en mayúsculas)', () =>
  assertFails(setDoc(doc(db('admin'), 'cupones/navidad2'), { descripcion: '', tipo: 'valor', valor: 1000, minimo: 0, desde: '2026-12-01', hasta: '2026-12-31', activo: true, soloClub: false, unUso: false })));
await caso('el admin lo apaga', () => assertSucceeds(updateDoc(doc(db('admin'), 'cupones/NAVIDAD'), { activo: false })));
await caso('el admin cuenta los usos', () => assertSucceeds(getDocs(collection(db('admin'), 'cupones/UNAVEZ/usos'))));

// ---------------------------------------------------------------------------
seccion('Eliminar la cuenta');
await caso('borra sus pedidos', () => assertSucceeds(deleteDoc(doc(db('ana'), 'pedidos/p2'))));
await caso('no borra pedidos de otros', () => assertFails(deleteDoc(doc(db('ana'), 'pedidos/de-beto'))));
await caso('borra su perfil', () => assertSucceeds(deleteDoc(doc(db('ana'), 'clientes/ana'))));
await caso('no borra el perfil de otro', () => assertFails(deleteDoc(doc(db('ana'), 'clientes/beto'))));

seccion('Lo demás está cerrado');
await caso('una colección cualquiera no se lee', () => assertFails(getDoc(doc(db('ana'), 'otra/cosa'))));
await caso('ni se escribe', () => assertFails(setDoc(doc(db('admin'), 'otra/cosa'), { a: 1 })));

await env.cleanup();
console.log(`\n${ok} bien, ${fallos} mal`);
process.exit(fallos ? 1 : 0);
