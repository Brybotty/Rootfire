// Revisión en Safari: abre el build en WebKit (el motor de Safari y de TODOS los navegadores del iPhone, Chrome
// incluido) con medidas de iPhone 13 y de iPhone SE, mide cada rótulo, busca scroll horizontal y errores, y toma
// capturas del menú, el detalle, el pedido y la promo en revision-safari/.
// Va con playwright-webkit 1.33 a propósito: trae Safari 16.4, donde un fallo de este tipo sí se ve (los rótulos
// dentro de un botón se salían de la tarjeta: Safari 16.4 calcula mal el ancho de una caja con aspect-ratio dentro
// de algo que se ajusta a su contenido). Chrome y el Safari más nuevo no lo muestran.
// Uso: npm run build && npm run safari     (la primera vez: npx playwright install webkit)
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { devices, webkit } from 'playwright-webkit';

const proyecto = resolve(import.meta.dirname, '..');
const salida = join(proyecto, 'revision-safari');
const DIST = join(proyecto, 'dist/rootfire-burgers/browser');
const PUERTO = Number(process.env.PUERTO ?? 4302);
const BASE = `http://127.0.0.1:${PUERTO}`;
if (!existsSync(join(DIST, 'index.html'))) {
  console.error('No hay build. Corre primero: npm run build');
  process.exit(1);
}
mkdirSync(salida, { recursive: true });
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const servidor = createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, BASE).pathname);
  let archivo = join(DIST, ruta);
  if (!existsSync(archivo) || ruta.endsWith('/')) archivo = join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream' });
  res.end(readFileSync(archivo));
});
await new Promise((ok) => servidor.listen(PUERTO, '127.0.0.1', ok));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const navegador = await webkit.launch();
const version = navegador.version();
const fallas = [];
for (const [nombre, equipo] of [['iphone13', devices['iPhone 13']], ['iphone-se', devices['iPhone SE']]]) {
  const contexto = await navegador.newContext({ ...equipo, serviceWorkers: 'block' });
  await contexto.addInitScript(() => localStorage.setItem('rootfire:promo', `halloween-2026|${new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10)}`));
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (e) => fallas.push(`${nombre} pageerror: ${e.message}`));
  await pagina.goto(BASE, { waitUntil: 'networkidle' });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.evaluate(() => document.querySelectorAll('.revelar').forEach((e) => e.classList.add('revelado')));

  // Cada rótulo: lo que mide su caja y lo que mide el dibujo, y si se sale de la pantalla o de su caja.
  const rotulos = await pagina.evaluate(() =>
    [...document.querySelectorAll('app-rotulo')].map((caja) => {
      const svg = caja.querySelector('svg');
      const c = caja.getBoundingClientRect();
      const d = svg?.getBoundingClientRect();
      const visible = c.width > 0 || (d?.width ?? 0) > 0;
      return { texto: caja.textContent.trim(), donde: caja.closest('[id]')?.id ?? '', caja: `${Math.round(c.width)}x${Math.round(c.height)}`, dibujo: d ? `${Math.round(d.width)}x${Math.round(d.height)}` : '-', visible, mal: !!d && (Math.abs(d.width - c.width) > 1.5 || Math.abs(d.height - c.height) > 1.5 || d.right > innerWidth + 1 || c.width < 20) };
    }),
  );
  console.log(`\n${nombre} (${equipo.viewport.width}x${equipo.viewport.height})`);
  for (const r of rotulos) console.log(`  ${r.mal ? 'MAL' : 'ok '} ${r.texto.padEnd(28)} caja ${r.caja.padEnd(9)} dibujo ${r.dibujo.padEnd(9)} ${r.donde}`);
  if (rotulos.some((r) => r.mal || !r.visible)) fallas.push(`${nombre}: rótulos mal medidos o invisibles: ${rotulos.filter((r) => r.mal || !r.visible).map((r) => r.texto).join(', ')}`);
  if (rotulos.length < 9) fallas.push(`${nombre}: solo hay ${rotulos.length} rótulos`);
  const desborde = await pagina.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (desborde) {
    const culpables = await pagina.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const recortado = (el) => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          if (getComputedStyle(p).overflowX === 'visible') continue;
          const r = p.getBoundingClientRect();
          if (r.left >= -1 && r.right <= vw + 1) return true;
        }
        return false;
      };
      return [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && !recortado(el); }).slice(0, 6).map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 4).join('.')} →${Math.round(el.getBoundingClientRect().right)} "${el.textContent.trim().slice(0, 24)}"`);
    });
    fallas.push(`${nombre}: la página tiene scroll horizontal: ${culpables.join(' | ')}`);
  }

  const ir = async (selector, margen = 130) => {
    await pagina.evaluate(([s, m]) => window.scrollTo({ top: document.querySelector(s).getBoundingClientRect().top + scrollY - m, behavior: 'instant' }), [selector, margen]);
    await esperar(900);
  };
  await pagina.screenshot({ path: join(salida, `${nombre}-1-inicio.png`) });
  await ir('app-destacados', 80);
  await pagina.screenshot({ path: join(salida, `${nombre}-2-estrella.png`) });
  await ir('#cat-hamburguesas ul', 110);
  await pagina.screenshot({ path: join(salida, `${nombre}-3-tarjeta.png`) });
  await ir('#cat-hamburguesas li:nth-child(2)', 110);
  await pagina.screenshot({ path: join(salida, `${nombre}-4-tarjeta-tilde.png`) });
  await ir('#cat-adiciones', 110);
  await pagina.screenshot({ path: join(salida, `${nombre}-5-listas.png`) });
  await ir('#la-casa ul', 110);
  await pagina.screenshot({ path: join(salida, `${nombre}-6-casa.png`) });
  await ir('app-pie app-rotulo', 300);
  await pagina.screenshot({ path: join(salida, `${nombre}-7-pie.png`) });

  // Detalle, pedido y promo
  await ir('#cat-hamburguesas ul', 110);
  await pagina.evaluate(() => document.querySelector('#cat-hamburguesas h4 button').click());
  await esperar(900);
  await pagina.screenshot({ path: join(salida, `${nombre}-8-detalle.png`) });
  await pagina.evaluate(() => [...document.querySelectorAll('dialog.hoja:not(.pedido) .opcion')].find((b) => b.textContent.includes('En combo')).click());
  await esperar(700);
  await pagina.screenshot({ path: join(salida, `${nombre}-9-detalle-combo.png`) });
  await pagina.evaluate(() => [...document.querySelectorAll('dialog.hoja:not(.pedido) button')].find((b) => b.textContent.trim().startsWith('Agregar')).click());
  await esperar(900);
  await pagina.evaluate(() => document.querySelector('app-pedido-barra button').click());
  await esperar(900);
  await pagina.screenshot({ path: join(salida, `${nombre}-10-pedido.png`) });
  await pagina.evaluate(() => [...document.querySelectorAll('dialog.pedido button')].find((b) => b.textContent.includes('Vaciar')).click());
  await pagina.keyboard.press('Escape');
  await esperar(600);
  await pagina.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await pagina.evaluate(() => document.querySelector('#inicio button[aria-haspopup="dialog"]').click());
  await esperar(1500);
  await pagina.screenshot({ path: join(salida, `${nombre}-11-promo.png`) });
  await contexto.close();
}
await navegador.close();
servidor.close();
console.log(fallas.length ? `\nFALLAS:\n- ${fallas.join('\n- ')}` : `\nSin fallas en Safari ${version}. Capturas en revision-safari/`);
process.exit(fallas.length ? 1 : 0);
