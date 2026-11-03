// Revisión del sitio ya publicado (sin navegador, en segundos): redirecciones a https sin www, certificado, encabezados
// de seguridad y caché por tipo de archivo, compresión, que lo subido sea idéntico al build (los hashes de ngsw.json),
// 404 de lo que no existe, archivos ocultos bloqueados, robots y sitemap, y que Firebase Auth acepte el dominio (sin
// eso no se puede entrar al Club ni al panel).
// Uso: npm run revisar:sitio                                  (el dominio de sitio.url)
//      npm run revisar:sitio -- https://rootfire-burgers--<canal>.web.app   (un canal de vista previa de Firebase)
//      npm run revisar:sitio -- http://127.0.0.1:8088 --host rootfireburguers.com   (un Apache local con el .htaccess)
// El emulador de Hosting no sirve para esto: en Windows no aplica ni `headers` ni `rewrites` (2026-11-03).
// Después de esta, la revisión completa en el navegador: URL_BASE=https://… npm run revisar
import { createHash } from 'node:crypto';
import { request as pedirHttp } from 'node:http';
import { request as pedirHttps } from 'node:https';
import { cargarConfig } from './lib/config.mjs';
import { csp, SEGURIDAD } from './lib/encabezados.mjs';

const { CLIENTE } = await cargarConfig();
const args = process.argv.slice(2);
const conHost = args.indexOf('--host');
const HOST = conHost >= 0 ? args.splice(conHost, 2)[1] : undefined;
const BASE = new URL((args[0] ?? CLIENTE.sitio.url).replace(/\/+$/, ''));
const CANONICO = new URL(CLIENTE.sitio.url).hostname;
const HTTPS = BASE.protocol === 'https:';
// Las redirecciones solo existen en el dominio propio (el .htaccess no toca la dirección de prueba ni el local).
const DOMINIO_PROPIO = HOST === CANONICO || BASE.hostname === CANONICO;

const fallas = [];
let total = 0;
const prueba = (nombre, ok, detalle = '') => {
  total++;
  console.log(`${ok ? '  ✔' : '  ✘'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallas.push(nombre);
};

/**
 * Una petición sin seguir redirecciones ni descomprimir. Con --host (Apache local por http) va como si hubiera llegado por
 * https a través de un proxy (X-Forwarded-Proto), para que el .htaccess no la redirija.
 */
function pedir(url, { host = HOST, comoHttps = !!HOST, encabezados = {} } = {}) {
  const u = new URL(url, BASE);
  const pedirCon = u.protocol === 'https:' ? pedirHttps : pedirHttp;
  const extra = { ...(host ? { host } : {}), ...(comoHttps ? { 'x-forwarded-proto': 'https' } : {}) };
  return new Promise((ok, falla) => {
    const inicio = Date.now();
    const r = pedirCon(u, { headers: { ...extra, 'user-agent': 'revisar-sitio', ...encabezados }, timeout: 20000 }, (res) => {
      const partes = [];
      const certificado = res.socket.getPeerCertificate?.();
      res.on('data', (d) => partes.push(d));
      res.on('end', () =>
        ok({
          estado: res.statusCode,
          h: (k) => String(res.headers[k.toLowerCase()] ?? ''),
          cuerpo: Buffer.concat(partes),
          ms: Date.now() - inicio,
          certificado,
        }),
      );
    });
    r.on('timeout', () => r.destroy(new Error('sin respuesta en 20 s')));
    r.on('error', falla);
    r.end();
  });
}
const intentar = (promesa) => promesa.catch((e) => ({ estado: 0, error: e.message, h: () => '', cuerpo: Buffer.alloc(0) }));

console.log(`\nRevisando ${BASE.origin}${HOST ? ` (Host: ${HOST})` : ''}`);

// ——— Redirecciones y certificado ———
if (DOMINIO_PROPIO) {
  console.log('\nRedirecciones');
  const destino = `https://${CANONICO}`;
  const casos = HOST
    ? [
        ['http, con ruta y parámetros', `${BASE.origin}/cuenta?volver=pedido`, CANONICO, `${destino}/cuenta?volver=pedido`],
        ['www', `${BASE.origin}/?promo`, `www.${CANONICO}`, `${destino}/?promo`],
      ]
    : [
        ['http, con ruta y parámetros', `http://${CANONICO}/cuenta?volver=pedido`, undefined, `${destino}/cuenta?volver=pedido`],
        ['http://www', `http://www.${CANONICO}/`, undefined, `${destino}/`],
        ['https://www', `https://www.${CANONICO}/?plato=root-burger`, undefined, `${destino}/?plato=root-burger`],
      ];
  // Se siguen hasta 3 saltos: Firebase pasa http://www primero a https://www y de ahí al dominio sin www.
  for (const [nombre, url, host, esperado] of casos) {
    const saltos = [];
    let r = await intentar(pedir(url, { host, comoHttps: false }));
    while ([301, 302, 307, 308].includes(r.estado) && saltos.length < 3) {
      saltos.push(`${r.estado} ${r.h('location')}`);
      if (r.h('location') === esperado || HOST) break;
      r = await intentar(pedir(r.h('location'), { host: undefined }));
    }
    const final = saltos.at(-1)?.split(' ')[1];
    prueba(`${nombre} → ${esperado}`, final === esperado && saltos.every((s) => s.startsWith('301')), r.error ?? saltos.join(' → '));
  }
}
if (HTTPS) {
  console.log('\nCertificado');
  for (const host of [BASE.hostname, ...(DOMINIO_PROPIO ? [`www.${CANONICO}`] : [])]) {
    const r = await intentar(pedir(`https://${host}/robots.txt`, { host: undefined }));
    const vence = r.certificado?.valid_to ? new Date(r.certificado.valid_to) : null;
    const dias = vence ? Math.floor((vence - Date.now()) / 86400000) : -1;
    prueba(`${host}: certificado válido y con más de 14 días`, !r.error && dias > 14, r.error ?? `vence en ${dias} días (${r.certificado?.issuer?.O ?? '¿?'})`);
  }
}

// ——— Páginas ———
console.log('\nPáginas');
const sinUpgrade = (v) => v.replace(/;\s*upgrade-insecure-requests/, '');
const paginas = ['/', '/index.html', '/cuenta', '/club', '/admin', '/admin/', '/politica-de-datos', '/terminos', '/?plato=root-burger'];
const malas = [];
let inicio;
for (const ruta of paginas) {
  const r = await intentar(pedir(ruta));
  if (ruta === '/') inicio = r;
  const falta = [
    r.estado !== 200 && `estado ${r.estado || r.error}`,
    !r.h('content-type').startsWith('text/html') && 'tipo',
    sinUpgrade(r.h('content-security-policy')) !== sinUpgrade(csp(CLIENTE)) && 'CSP',
    HTTPS && !r.h('content-security-policy').includes('upgrade-insecure-requests') && 'upgrade-insecure-requests',
    !r.h('cross-origin-opener-policy') && 'COOP',
    r.h('cache-control') !== 'no-cache' && `caché (${r.h('cache-control') || '—'})`,
    ...Object.keys(SEGURIDAD).filter((k) => k !== 'Strict-Transport-Security' && r.h(k) !== SEGURIDAD[k]),
    // Firebase pone el suyo (un año, con includeSubDomains y preload) en lugar del nuestro: basta con un año o más.
    HTTPS && !(Number(r.h('strict-transport-security').match(/max-age=(\d+)/)?.[1]) >= 31536000) && 'HSTS',
  ].filter(Boolean);
  if (falta.length) malas.push(`${ruta}: ${falta.join(', ')}`);
}
prueba(`las ${paginas.length} páginas responden 200 con CSP, COOP, seguridad y sin caché`, malas.length === 0, malas.join(' | '));
const html = inicio?.cuerpo.toString('utf8') ?? '';
const canonico = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
prueba('canonical, Open Graph y robots apuntan al dominio', canonico === `${CLIENTE.sitio.url}/` && html.includes(`og:url" content="${CLIENTE.sitio.url}/"`), canonico ?? 'sin canonical');
if (inicio?.ms !== undefined) prueba('el inicio responde en menos de 1,5 s', inicio.ms < 1500, `${inicio.ms} ms`);

// ——— Archivos: lo subido es idéntico al build ———
console.log('\nArchivos');
const manifiesto = await intentar(pedir('/ngsw.json'));
let tabla = {};
try {
  tabla = JSON.parse(manifiesto.cuerpo.toString('utf8')).hashTable ?? {};
} catch {}
const distintos = [];
for (const [ruta, hash] of Object.entries(tabla)) {
  const r = await intentar(pedir(ruta));
  const sha = createHash('sha1').update(r.cuerpo).digest('hex');
  if (r.estado !== 200 || sha !== hash) distintos.push(`${ruta} (${r.estado || r.error}${r.estado === 200 ? ', otro contenido' : ''})`);
}
prueba(`los ${Object.keys(tabla).length} archivos de ngsw.json están y son idénticos al build`, Object.keys(tabla).length > 0 && distintos.length === 0, distintos.slice(0, 8).join(', ') || (manifiesto.estado !== 200 ? `ngsw.json: ${manifiesto.estado}` : ''));

const principal = html.match(/main-[A-Z0-9]{8}\.js/)?.[0];
const tipos = [
  [`/${principal}`, /^text\/javascript|^application\/javascript/, 'public, max-age=31536000, immutable'],
  [`/${html.match(/styles-[A-Z0-9]{8}\.css/)?.[0]}`, /^text\/css/, 'public, max-age=31536000, immutable'],
  ['/ngsw-worker.js', /javascript/, 'no-cache'],
  ['/ngsw.json', /^application\/json/, 'no-cache'],
  ['/manifest.webmanifest', /^application\/manifest\+json/, 'no-cache'],
  ['/fonts/figtree.woff2', /^font\/woff2/, 'public, max-age=2592000'],
  ['/platos/root-burger.webp', /^image\/webp/, 'public, max-age=86400'],
  ['/favicon.svg', /^image\/svg\+xml/, 'public, max-age=86400'],
];
for (const [ruta, tipo, cache] of tipos) {
  const r = await intentar(pedir(ruta));
  prueba(
    `${ruta}: tipo y caché`,
    r.estado === 200 && tipo.test(r.h('content-type')) && r.h('cache-control') === cache && !r.h('content-security-policy'),
    `${r.estado || r.error} · ${r.h('content-type')} · ${r.h('cache-control') || '—'}${r.h('content-security-policy') ? ' · con CSP' : ''}`,
  );
}
const comprimido = await intentar(pedir(`/${principal}`, { encabezados: { 'accept-encoding': 'br, gzip' } }));
prueba('el JavaScript viaja comprimido', /^(br|gzip)$/.test(comprimido.h('content-encoding')), comprimido.h('content-encoding') || 'sin compresión');

// ——— Lo que no debe verse ———
console.log('\nLo que no debe verse');
const falta = await intentar(pedir('/no-existe-ABCD1234.js'));
prueba('un archivo que no existe da 404 (no la página)', falta.estado === 404, String(falta.estado || falta.error));
const ocultos = [];
for (const ruta of ['/.htaccess', '/.git/config', '/.env', '/.DS_Store']) {
  const r = await intentar(pedir(ruta));
  if (r.estado === 200) ocultos.push(ruta);
}
prueba('archivos ocultos bloqueados (.htaccess, .git, .env)', ocultos.length === 0, ocultos.join(', '));
const carpeta = await intentar(pedir('/platos/'));
prueba('sin listado de carpetas', !/Index of|Parent Directory/i.test(carpeta.cuerpo.toString('utf8')), String(carpeta.estado));
const sobrantes = [];
for (const ruta of ['/default.php', '/index.php']) if ((await intentar(pedir(ruta))).estado === 200) sobrantes.push(ruta);
prueba('sin archivos de muestra del hosting (default.php)', sobrantes.length === 0, sobrantes.join(', '));

// ——— Buscadores y Firebase ———
console.log('\nBuscadores y Firebase');
const robots = (await intentar(pedir('/robots.txt'))).cuerpo.toString('utf8');
const sitemap = (await intentar(pedir('/sitemap.xml'))).cuerpo.toString('utf8');
prueba('robots.txt y sitemap.xml con el dominio', robots.includes(`Sitemap: ${CLIENTE.sitio.url}/sitemap.xml`) && sitemap.includes(`<loc>${CLIENTE.sitio.url}/</loc>`));
if (CLIENTE.firebase?.apiKey) {
  // El mismo servicio que consulta el SDK de Firebase antes de abrir la ventana de Google.
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${CLIENTE.firebase.apiKey}`).then((x) => x.json()).catch(() => ({}));
  const dominios = r.authorizedDomains ?? [];
  // Solo el dominio sin www: el www redirige antes de cargar la app.
  const faltan = [CANONICO].filter((d) => !dominios.includes(d));
  prueba('Firebase Auth acepta el dominio (para entrar al Club y al panel)', faltan.length === 0, faltan.length ? `faltan en Authentication → Configuración → Dominios autorizados: ${faltan.join(', ')}` : '');
}

console.log(`\n${total - fallas.length} de ${total} pruebas OK.`);
process.exit(fallas.length ? 1 : 0);
