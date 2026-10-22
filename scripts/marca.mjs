// Genera los archivos de la marca: los íconos llevan la cabecita de la mascota (src/app/marca/mascota.ts) y la
// imagen para redes, el logotipo, la foto y los stickers oficiales de la diseñadora:
//   public/favicon.svg, public/favicon.ico (16, 32, 48), public/apple-touch-icon.png (180),
//   public/icons/icono-192.png, icono-512.png, icono-maskable-512.png, public/og-<cliente>.jpg (1200x630)
// Uso: npm run marca   (usa el Chrome instalado para pasar de SVG a PNG)
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { abrirChrome, capturarHtml } from './lib/chrome.mjs';
import { cargarConfig } from './lib/config.mjs';
import { COLORES as C, MASCOTA, datos, enSvg, grupoMascota, logotipo, sticker, svg } from './lib/svg-marca.mjs';

const { CLIENTE, MENU } = await cargarConfig();
const raiz = (ruta) => resolve(import.meta.dirname, '..', ruta);
mkdirSync(raiz('public/icons'), { recursive: true });

// ——— SVG ———
// Favicon: la cabecita de la mascota, recortada al ras (con el contorno oscuro se lee en pestañas claras y oscuras).
const favicon = svg(112, 112, `<g transform="translate(6 0)">${grupoMascota({ id: 'f' })}</g>`, { titulo: CLIENTE.nombre });
writeFileSync(raiz('public/favicon.svg'), favicon);

// Ícono con fondo: `tamano` es la parte del lado que ocupa la mascota (en alto).
const icono = ({ redondeo = 0.22, tamano = 0.76, fondo = C.carbon } = {}) => {
  const lado = 512;
  const escala = (lado * tamano) / MASCOTA.alto;
  const x = (lado - MASCOTA.ancho * escala) / 2;
  const y = (lado - MASCOTA.alto * escala) / 2;
  return svg(
    lado,
    lado,
    `<defs><radialGradient id="brasa" cx=".5" cy=".62" r=".55"><stop offset="0" stop-color="${C.rojo}" stop-opacity=".5"/><stop offset="1" stop-color="${C.rojo}" stop-opacity="0"/></radialGradient></defs>
     <rect width="${lado}" height="${lado}" rx="${lado * redondeo}" fill="${fondo}"/>
     <rect width="${lado}" height="${lado}" rx="${lado * redondeo}" fill="url(#brasa)"/>
     <g transform="translate(${x} ${y}) scale(${escala})">${grupoMascota({ id: 'i' })}</g>`,
  );
};

// ——— PNG ———
const pagina = (contenido, fondo = 'transparent') =>
  `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:${fondo}}svg{display:block;width:100vw;height:100vh}</style></head><body>${contenido}</body></html>`;

const navegador = await abrirChrome();
const png = async (contenido, ruta, lado, fondo) => capturarHtml(navegador, pagina(contenido, fondo), ruta, { ancho: lado, alto: lado, transparente: !fondo });

await png(icono(), raiz('public/icons/icono-512.png'), 512);
await png(icono(), raiz('public/icons/icono-192.png'), 192);
// Maskable: fondo al ras y la mascota dentro de la zona segura (círculo del 80 %).
await png(icono({ redondeo: 0, tamano: 0.56 }), raiz('public/icons/icono-maskable-512.png'), 512, C.carbon);
// iOS redondea las esquinas por su cuenta y no admite transparencia.
await png(icono({ redondeo: 0, tamano: 0.72 }), raiz('public/apple-touch-icon.png'), 180, C.carbon);

// favicon.ico con PNG de 16, 32 y 48 dentro.
const tamanos = [16, 32, 48];
const imagenes = [];
for (const lado of tamanos) {
  const ruta = raiz(`public/icons/.favicon-${lado}.png`);
  await png(favicon, ruta, lado);
  imagenes.push(readFileSync(ruta));
  rmSync(ruta);
}
const cabecera = Buffer.alloc(6 + 16 * imagenes.length);
cabecera.writeUInt16LE(0, 0);
cabecera.writeUInt16LE(1, 2);
cabecera.writeUInt16LE(imagenes.length, 4);
let desplazamiento = cabecera.length;
imagenes.forEach((imagen, i) => {
  const base = 6 + i * 16;
  cabecera.writeUInt8(tamanos[i], base);
  cabecera.writeUInt8(tamanos[i], base + 1);
  cabecera.writeUInt16LE(1, base + 4);
  cabecera.writeUInt16LE(32, base + 6);
  cabecera.writeUInt32LE(imagen.length, base + 8);
  cabecera.writeUInt32LE(desplazamiento, base + 12);
  desplazamiento += imagen.length;
});
writeFileSync(raiz('public/favicon.ico'), Buffer.concat([cabecera, ...imagenes]));

// ——— Imagen para compartir (Open Graph, 1200 x 630) ———
const fuente = (archivo) => datos(archivo, 'font/woff2');
const f = CLIENTE.tema.fuentes;
const estrella = MENU.platos.find((p) => p.destacado && p.foto) ?? MENU.platos.find((p) => p.foto);
const og = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:D;src:url(${fuente(f.display.archivo)}) format('woff2');font-weight:${f.display.pesos}}
@font-face{font-family:T;src:url(${fuente(f.texto.archivo)}) format('woff2');font-weight:${f.texto.pesos}}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{position:relative;background:radial-gradient(900px 560px at 74% 112%,${C.amarillo} 0%,${C.naranja} 28%,${C.rojo} 60%,${C.rojoOscuro} 100%);font-family:T;color:${C.crema}}
.grano{position:absolute;inset:0;opacity:.16;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.logo{position:absolute;left:84px;top:56px;height:400px}
.lema{position:absolute;left:84px;bottom:92px;font-family:D;font-weight:800;font-size:58px;letter-spacing:.01em;text-transform:uppercase;line-height:1}
.sub{position:absolute;left:86px;bottom:50px;font-size:24px;font-weight:600;letter-spacing:.03em;opacity:.92}
.foto{position:absolute;right:60px;top:70px;width:640px;filter:drop-shadow(0 30px 34px rgba(40,6,0,.5))}
.sticker{position:absolute;filter:drop-shadow(0 10px 12px rgba(40,6,0,.4))}
</style></head><body>
<img class="logo" src="${enSvg(logotipo('apilado', { color: C.amarillo, colorBurgers: C.crema }).texto)}">
${estrella ? `<img class="foto" src="${datos(estrella.foto.src, 'image/webp')}">` : ''}
<img class="sticker" style="right:44px;bottom:36px;height:230px;transform:rotate(7deg)" src="${enSvg(sticker('mascota-guino').texto)}">
<img class="sticker" style="right:610px;top:60px;height:96px;transform:rotate(-12deg)" src="${enSvg(sticker('corona').texto)}">
<div class="lema">${CLIENTE.lema}</div>
<div class="sub">${[CLIENTE.ubicacion.ciudad, `@${CLIENTE.redes.find((r) => r.red === 'instagram')?.usuario ?? ''}`].filter(Boolean).join(' · ')}</div>
<div class="grano"></div>
</body></html>`;
await capturarHtml(navegador, og, raiz(`public/og-${CLIENTE.id}.jpg`), { ancho: 1200, alto: 630, tipo: 'jpeg', calidad: 86 });
await navegador.close();

console.log(`Marca lista: favicon.svg/.ico, apple-touch-icon, icons/icono-*.png y og-${CLIENTE.id}.jpg`);
