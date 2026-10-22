// Escribe los archivos que salen de la configuración del cliente (src/app/config):
//   src/tema.css               colores y fuentes como variables CSS (sin esperar al JavaScript)
//   src/index.html             título, descripción, Open Graph, precarga de fuentes y JSON-LD (Restaurant + Menu)
//   public/manifest.webmanifest, public/robots.txt, public/sitemap.xml
// Corre solo con `npm start` y `npm run build`. Uso directo: node scripts/preparar.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cargarConfig } from './lib/config.mjs';

const { CLIENTE: c, MENU } = await cargarConfig();
const { horarioSchema } = await import('../src/app/negocio/horario.ts');

const url = c.sitio.url.replace(/\/+$/, '');
const raiz = (archivo) => resolve(import.meta.dirname, '..', archivo);
const html = (texto) => String(texto).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escribir = (archivo, contenido) => {
  const ruta = raiz(archivo);
  let anterior = '';
  try {
    anterior = readFileSync(ruta, 'utf8');
  } catch {}
  if (anterior !== contenido) {
    writeFileSync(ruta, contenido);
    console.log(`  actualizado  ${archivo}`);
  }
};

// ——— Tema ———
const t = c.tema;
const variables = [
  ...['fondo', 'papel', 'primario', 'secundario', 'destello', 'fresco'].flatMap((nombre) =>
    Object.entries(t[nombre]).map(([tono, rgb]) => `  --${nombre}-${tono}: ${rgb};`),
  ),
  `  --sobre-destello: ${t.sobreDestello};`,
  `  --sobre-primario: ${t.sobrePrimario};`,
  `  --fuente-display: '${t.fuentes.display.familia}', ${t.fuentes.display.respaldo};`,
  `  --fuente-texto: '${t.fuentes.texto.familia}', ${t.fuentes.texto.respaldo};`,
];
const fontFace = (f) => `@font-face {
  font-family: '${f.familia}';
  src: url('/${f.archivo}') format('woff2');
  font-weight: ${f.pesos};
  font-style: normal;
  font-display: swap;
}`;
escribir(
  'src/tema.css',
  `/* Generado por scripts/preparar.mjs desde src/app/config/clientes/${c.id}.ts. No editar a mano. */
${fontFace(t.fuentes.display)}
${fontFace(t.fuentes.texto)}
:root {
${variables.join('\n')}
}
${Object.entries(t.tonos)
  .map(([nombre, v]) => `.tono-${nombre} { --tono-fondo: ${v.fondo}; --tono-titulo: ${v.titulo}; --tono-texto: ${v.texto}; --tono-acento: ${v.acento}; }`)
  .join('\n')}
`,
);

// ——— Datos estructurados (sin los platos de ejemplo) ———
const dieta = { vegetariano: 'https://schema.org/VegetarianDiet', 'sin-gluten': 'https://schema.org/GlutenFreeDiet' };
const secciones = [...MENU.categorias]
  .sort((a, b) => a.orden - b.orden)
  .map((cat) => ({
    '@type': 'MenuSection',
    name: cat.nombre,
    hasMenuItem: MENU.platos
      .filter((p) => p.categoriaId === cat.id && !p.ejemplo)
      .sort((a, b) => a.orden - b.orden)
      .map((p) => {
        const dietas = (p.etiquetas ?? []).map((e) => dieta[e]).filter(Boolean);
        return {
          '@type': 'MenuItem',
          name: p.nombre,
          ...(p.foto ? { image: `${url}/${p.foto.src}` } : {}),
          ...(p.descripcion ? { description: [p.descripcion, p.frase].filter(Boolean).join(' ') } : {}),
          offers: p.precioCombo
            ? [
                { '@type': 'Offer', name: 'Sola', price: String(p.precio), priceCurrency: MENU.moneda },
                { '@type': 'Offer', name: 'En combo', price: String(p.precioCombo), priceCurrency: MENU.moneda, ...(MENU.notaCombo ? { description: MENU.notaCombo } : {}) },
              ]
            : { '@type': 'Offer', price: String(p.precio), priceCurrency: MENU.moneda },
          ...(dietas.length ? { suitableForDiet: dietas } : {}),
        };
      }),
  }))
  .filter((s) => s.hasMenuItem.length > 0);

const u = c.ubicacion;
const horas = horarioSchema(c.horario);
const restaurante = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  '@id': `${url}/#restaurante`,
  name: c.nombre,
  url: `${url}/`,
  description: c.descripcion,
  slogan: c.lema,
  image: `${url}/og-${c.id}.jpg`,
  logo: `${url}/icons/icono-512.png`,
  servesCuisine: c.sitio.cocina,
  sameAs: c.redes.map((r) => r.url),
  ...(c.sitio.rangoPrecios ? { priceRange: c.sitio.rangoPrecios } : {}),
  ...(c.contacto.whatsapp.activo && c.contacto.whatsapp.numero ? { telephone: `+${c.contacto.whatsapp.numero}` } : {}),
  ...(u.direccion && u.ciudad
    ? {
        address: {
          '@type': 'PostalAddress',
          streetAddress: [u.direccion, u.barrio].filter(Boolean).join(', '),
          addressLocality: u.ciudad,
          ...(u.departamento ? { addressRegion: u.departamento } : {}),
          addressCountry: 'CO',
        },
      }
    : {}),
  ...(u.coordenadas ? { geo: { '@type': 'GeoCoordinates', latitude: u.coordenadas.latitud, longitude: u.coordenadas.longitud } } : {}),
  ...(u.mapaUrl ? { hasMap: u.mapaUrl } : {}),
  ...(horas.length ? { openingHoursSpecification: horas } : {}),
  hasMenu: {
    '@type': 'Menu',
    name: `Menú de ${c.nombre}`,
    url: `${url}/#menu`,
    inLanguage: c.sitio.idioma,
    ...(secciones.length ? { hasMenuSection: secciones } : {}),
  },
};
const jsonLd = JSON.stringify(restaurante, null, 2).replace(/</g, '\\u003c');

// ——— index.html ———
const titulo = [c.nombre, 'Menú', u.ciudad].filter(Boolean).join(' · ');
const og = `${url}/og-${c.id}.jpg`;
const bloque = `<!-- preparar:inicio · lo escribe scripts/preparar.mjs desde la config del cliente; no editar a mano -->
  <title>${html(titulo)}</title>
  <meta name="description" content="${html(c.descripcion)}">
  <link rel="canonical" href="${url}/">
  <meta name="theme-color" content="${t.colorNavegador}">
  <meta property="og:type" content="restaurant.restaurant">
  <meta property="og:site_name" content="${html(c.nombre)}">
  <meta property="og:title" content="${html(`${c.nombre} · ${c.lema}`)}">
  <meta property="og:description" content="${html(c.descripcion)}">
  <meta property="og:url" content="${url}/">
  <meta property="og:locale" content="${c.sitio.idioma.replace('-', '_')}">
  <meta property="og:image" content="${og}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${html(`Logo de ${c.nombre}: la mascota de llama y el nombre en letras amarillas`)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${og}">
  <link rel="preload" href="${t.fuentes.display.archivo}" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${t.fuentes.texto.archivo}" as="font" type="font/woff2" crossorigin>
  <script type="application/ld+json">
${jsonLd}
  </script>
  <!-- preparar:fin -->`;
const indice = readFileSync(raiz('src/index.html'), 'utf8');
if (!/<!-- preparar:inicio[\s\S]*?<!-- preparar:fin -->/.test(indice)) {
  throw new Error('src/index.html no tiene las marcas <!-- preparar:inicio --> … <!-- preparar:fin -->');
}
escribir('src/index.html', indice.replace(/<!-- preparar:inicio[\s\S]*?<!-- preparar:fin -->/, bloque));

// ——— Manifiesto (PWA) ———
const manifiesto = {
  name: `${c.nombre} · Menú`,
  short_name: c.nombreCorto,
  description: c.descripcion,
  lang: c.sitio.idioma,
  dir: 'ltr',
  start_url: './',
  scope: './',
  id: './',
  display: 'standalone',
  background_color: t.colorNavegador,
  theme_color: t.colorNavegador,
  categories: ['food'],
  icons: [
    { src: 'icons/icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  shortcuts: [
    { name: 'Ver el menú', short_name: 'Menú', url: './#menu' },
    { name: 'Horario y ubicación', short_name: 'Visítanos', url: './#visitanos' },
  ],
};
escribir('public/manifest.webmanifest', `${JSON.stringify(manifiesto, null, 2)}\n`);

// ——— robots.txt y sitemap.xml ———
escribir('public/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${url}/sitemap.xml\n`);
escribir(
  'public/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${url}/</loc></url>\n</urlset>\n`,
);

const ejemplos = MENU.platos.filter((p) => p.ejemplo).length;
console.log(`preparar: ${c.nombre} listo (${MENU.platos.length - ejemplos} platos reales en los datos estructurados, ${ejemplos} de ejemplo fuera).`);
