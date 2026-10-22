// Pruebas de storage.rules: las imágenes de la carta las lee cualquiera y solo las sube el admin.
//
// Uso: npm run test:reglas   (levanta los emuladores de Firestore y Storage; no toca el proyecto real)
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';

const leer = (archivo) => readFileSync(new URL(`../${archivo}`, import.meta.url), 'utf8');
const env = await initializeTestEnvironment({
  projectId: 'demo-reglas-rootfire',
  firestore: { rules: leer('firestore.rules'), host: '127.0.0.1', port: 8080 },
  storage: { rules: leer('storage.rules'), host: '127.0.0.1', port: 9199 },
});
await env.clearStorage();
await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'admins/socio@x.com'), { agregadoEn: new Date() }));

const PRINCIPAL = 'ortizgonzalesbryanalexander1@gmail.com';
const st = (uid, email, verificado = true) => env.authenticatedContext(uid, { email, email_verified: verificado }).storage();
const anon = () => env.unauthenticatedContext().storage();
const imagen = (tipo = 'image/webp', bytes = 2048) => [new Uint8Array(bytes), { contentType: tipo }];

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

console.log('\nImágenes de la carta');
await caso('la cuenta principal sube una foto de plato', () => assertSucceeds(uploadBytes(ref(st('a', PRINCIPAL), 'publico/platos/nueva.webp'), ...imagen())));
await caso('un admin de la lista sube un afiche', () => assertSucceeds(uploadBytes(ref(st('s', 'socio@x.com'), 'publico/promos/navidad.jpg'), ...imagen('image/jpeg'))));
await caso('cualquiera la ve', () => assertSucceeds(getBytes(ref(anon(), 'publico/platos/nueva.webp'))));
await caso('un cliente no sube imágenes', () => assertFails(uploadBytes(ref(st('c', 'ana@x.com'), 'publico/platos/x.webp'), ...imagen())));
await caso('un visitante no sube imágenes', () => assertFails(uploadBytes(ref(anon(), 'publico/platos/x.webp'), ...imagen())));
await caso('sin correo verificado no', () => assertFails(uploadBytes(ref(st('a', PRINCIPAL, false), 'publico/platos/x.webp'), ...imagen())));
await caso('ni HTML ni SVG', () => assertFails(uploadBytes(ref(st('a', PRINCIPAL), 'publico/platos/x.svg'), ...imagen('image/svg+xml'))));
await caso('ni de más de 3 MB', () => assertFails(uploadBytes(ref(st('a', PRINCIPAL), 'publico/platos/grande.webp'), ...imagen('image/webp', 3 * 1024 * 1024 + 1))));
await caso('solo en las carpetas de la carta', () => assertFails(uploadBytes(ref(st('a', PRINCIPAL), 'publico/otra/x.webp'), ...imagen())));
await caso('fuera de publico/ nada', () => assertFails(uploadBytes(ref(st('a', PRINCIPAL), 'privado/x.webp'), ...imagen())));
await caso('un cliente no borra imágenes', () => assertFails(deleteObject(ref(st('c', 'ana@x.com'), 'publico/platos/nueva.webp'))));
await caso('el admin las borra', () => assertSucceeds(deleteObject(ref(st('a', PRINCIPAL), 'publico/platos/nueva.webp'))));

await env.cleanup();
console.log(`\n${ok} bien, ${fallos} mal`);
process.exit(fallos ? 1 : 0);
