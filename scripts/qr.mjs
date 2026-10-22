// Genera el QR de la carta para las mesas:
//   qr/<cliente>-qr.svg         con la mascota al centro (corrección de errores alta: soporta el logo)
//   qr/<cliente>-qr.png         1024 x 1024
//   qr/<cliente>-qr-simple.svg  negro sobre blanco, sin logo (para imprentas o fondos difíciles)
//   qr/<cliente>-tarjeta-mesa.pdf  tarjeta A6 lista para imprimir
// Uso: npm run qr                       (usa sitio.url de la config del cliente)
//      npm run qr -- https://midominio.com
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import QRCode from 'qrcode';
import { abrirChrome, capturarHtml } from './lib/chrome.mjs';
import { cargarConfig } from './lib/config.mjs';
import { COLORES as C, MASCOTA, datos, enSvg, grupoMascota, logotipo, sticker } from './lib/svg-marca.mjs';

const { CLIENTE } = await cargarConfig();
const url = (process.argv[2] ?? CLIENTE.sitio.url).trim();
if (!/^https:\/\/[^\s]+$/.test(url)) {
  console.error(`La dirección debe empezar por https:// (recibí "${url}").`);
  process.exit(1);
}
const raiz = (ruta) => resolve(import.meta.dirname, '..', ruta);
mkdirSync(raiz('qr'), { recursive: true });
const nombre = (sufijo) => raiz(`qr/${CLIENTE.id}-${sufijo}`);

const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
const N = qr.modules.size;
const oscuro = (x, y) => qr.modules.get(y, x) === 1;
const MARGEN = 4; // zona silenciosa que piden los lectores
const lado = N + MARGEN * 2;
const esOjo = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);

// ——— Versión simple ———
let simple = '';
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (oscuro(x, y)) simple += `M${x + MARGEN} ${y + MARGEN}h1v1h-1z`;
writeFileSync(
  nombre('qr-simple.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" shape-rendering="crispEdges"><title>Menú de ${CLIENTE.nombre}: ${url}</title><rect width="${lado}" height="${lado}" fill="#fff"/><path d="${simple}" fill="#000"/></svg>`,
);

// ——— Versión con marca ———
// Hueco central para la mascota: ~22 % del lado (la corrección H recupera hasta 30 %).
const hueco = Math.round(N * 0.22) | 1;
const inicioHueco = (N - hueco) / 2;
const enHueco = (x, y) => x >= inicioHueco - 0.5 && x < inicioHueco + hueco - 0.5 && y >= inicioHueco - 0.5 && y < inicioHueco + hueco - 0.5;
let puntos = '';
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    if (!oscuro(x, y) || esOjo(x, y) || enHueco(x, y)) continue;
    // Módulos de tamaño completo con esquinas apenas redondeadas: con espacios entre ellos algunos lectores fallan.
    puntos += `<rect x="${x + MARGEN}" y="${y + MARGEN}" width="1.02" height="1.02" rx=".22"/>`;
  }
}
const ojo = (x, y) =>
  `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.2" fill="none" stroke="${C.tinta}" stroke-width="1"/>` +
  `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx=".6" fill="${C.rojoOscuro}"/>`;
const escalaMascota = (hueco - 1.4) / MASCOTA.alto;
const xm = MARGEN + inicioHueco + (hueco - MASCOTA.ancho * escalaMascota) / 2 - 0.5;
const ym = MARGEN + inicioHueco + 0.2;
const marca = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}"><title>Menú de ${CLIENTE.nombre}: ${url}</title>
<rect width="${lado}" height="${lado}" rx="2" fill="#FFF8EE"/>
<g fill="${C.tinta}">${puntos}</g>
${ojo(MARGEN, MARGEN)}${ojo(MARGEN + N - 7, MARGEN)}${ojo(MARGEN, MARGEN + N - 7)}
<rect x="${MARGEN + inicioHueco - 0.3}" y="${MARGEN + inicioHueco - 0.3}" width="${hueco - 0.4}" height="${hueco - 0.4}" rx="1.6" fill="#FFF8EE"/>
<g transform="translate(${xm.toFixed(2)} ${ym.toFixed(2)}) scale(${escalaMascota.toFixed(4)})">${grupoMascota({ id: 'qr' })}</g>
</svg>`;
writeFileSync(nombre('qr.svg'), marca);

// ——— PNG y tarjeta de mesa ———
const fuente = (archivo) => datos(archivo, 'font/woff2');
const f = CLIENTE.tema.fuentes;
const navegador = await abrirChrome();
await capturarHtml(
  navegador,
  `<!doctype html><html><head><style>html,body{margin:0}svg{display:block;width:1024px;height:1024px}</style></head><body>${marca}</body></html>`,
  nombre('qr.png'),
  { ancho: 1024, alto: 1024 },
);

const sitio = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
const pagina = await navegador.newPage();
await pagina.setContent(
  `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:D;src:url(${fuente(f.display.archivo)}) format('woff2');font-weight:${f.display.pesos}}
  @font-face{font-family:T;src:url(${fuente(f.texto.archivo)}) format('woff2');font-weight:${f.texto.pesos}}
  @page{size:A6;margin:0}
  html,body{margin:0;color-scheme:light}
  .tarjeta{box-sizing:border-box;position:relative;width:105mm;height:148mm;padding:8mm 9mm 7mm;display:flex;flex-direction:column;align-items:center;text-align:center;
    background:radial-gradient(120% 70% at 50% 110%,${C.amarillo} 0%,${C.naranja} 32%,${C.rojo} 64%,${C.rojoOscuro} 100%);color:${C.crema};font-family:T}
  .logo{height:17mm;margin:0 0 4mm}
  .titulo{font-family:D;font-weight:800;text-transform:uppercase;font-size:27pt;line-height:.9;margin:0}
  .sub{font-size:10.5pt;font-weight:600;margin:2.5mm 0 4.5mm;opacity:.95}
  .qr{background:#FFF8EE;border-radius:5mm;padding:2mm;box-shadow:0 3mm 8mm rgba(40,6,0,.35)}
  .qr svg{display:block;width:60mm;height:60mm}
  .pie{margin-top:auto;font-family:D;font-weight:800;text-transform:uppercase;font-size:15pt;color:${C.amarillo};letter-spacing:.02em}
  .web{font-size:8.5pt;font-weight:600;margin-top:1mm}
  .sticker{position:absolute;filter:drop-shadow(0 1.5mm 2mm rgba(40,6,0,.4))}
  </style></head><body><div class="tarjeta">
    <img class="logo" src="${enSvg(logotipo('linea', { color: C.amarillo, colorBurgers: C.crema }).texto)}">
    <p class="titulo">Mira el menú</p>
    <p class="sub">Escanea con la cámara de tu celular</p>
    <div class="qr">${marca}</div>
    <img class="sticker" style="left:3mm;bottom:13mm;height:26mm;transform:rotate(-7deg)" src="${enSvg(sticker('mascota-senala').texto)}">
    <img class="sticker" style="right:4mm;bottom:15mm;height:19mm;transform:rotate(9deg)" src="${enSvg(sticker('hamburguesa-doble').texto)}">
    <div class="pie">${CLIENTE.cierre}</div>
    <div class="web">${sitio}</div>
  </div></body></html>`,
  { waitUntil: 'load' },
);
await pagina.evaluate(() => document.fonts.ready);
await pagina.pdf({ path: nombre('tarjeta-mesa.pdf'), width: '105mm', height: '148mm', printBackground: true });
await navegador.close();

console.log(`QR listo para ${url}\n  qr/${CLIENTE.id}-qr.svg, qr/${CLIENTE.id}-qr.png, qr/${CLIENTE.id}-qr-simple.svg y qr/${CLIENTE.id}-tarjeta-mesa.pdf`);
