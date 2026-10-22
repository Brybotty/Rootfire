// Revisión automática del build con el Chrome del equipo (puppeteer-core).
// Sirve dist/ con los mismos encabezados de firebase.json (CSP incluida) y revisa en 360, 390, 414, 768,
// 1024 y 1440 px: scroll horizontal, errores de consola, zonas táctiles, letra mínima, rótulos de las
// hamburguesas, búsqueda, filtros, barra de categorías, detalle del plato (con "atrás" y enlace compartido),
// horario con festivos, promo del mes (ventana, sello en su tarjeta y enlace ?promo), pedido por WhatsApp,
// sin conexión e impresión.
// Uso: npm run build && npm run revisar      (capturas y reporte en revision/)
//      PUERTO=4302 npm run revisar           (si 4301 está ocupado)
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { abrirChrome } from './lib/chrome.mjs';
import { cargarConfig } from './lib/config.mjs';

const { CLIENTE, MENU } = await cargarConfig();
const { ROTULOS } = await import('../src/app/marca/nombres.ts');
const { promoVigente } = await import('../src/app/negocio/promocion.ts');
const PROMO = promoVigente(CLIENTE.promocion);
const CLAVE_PROMO = `${CLIENTE.id}:promo`;
const CLAVE_PEDIDO = `${CLIENTE.id}:pedido`;
const PEDIDOS = CLIENTE.contacto.whatsapp.activo && !!CLIENTE.contacto.whatsapp.pedidos;
const pesos = (valor) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor).replace(/\s/g, ' ');
const nombres = (lista) => lista.map((p) => p.nombre);
const [corteBajo, corteAlto] = MENU.rangosPrecio;

const RAIZ = resolve(import.meta.dirname, '..');
const DIST = join(RAIZ, 'dist/rootfire-burgers/browser');
const SALIDA = join(RAIZ, 'revision');
const PUERTO = Number(process.env.PUERTO ?? 4301);
const ANCHOS = [360, 390, 414, 768, 1024, 1440];
const BASE = `http://127.0.0.1:${PUERTO}`;

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('No hay build. Corre primero: npm run build');
  process.exit(1);
}
rmSync(SALIDA, { recursive: true, force: true });
mkdirSync(SALIDA, { recursive: true });

// ——— Servidor estático con los encabezados de Firebase Hosting ———
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.webp': 'image/webp',
};
const hosting = JSON.parse(readFileSync(join(RAIZ, 'firebase.json'), 'utf8')).hosting;
const encabezados = Object.fromEntries(
  hosting.headers
    .find((h) => h.source === '**')
    .headers.map(({ key, value }) => [key, key === 'Content-Security-Policy' ? value.replace(/;\s*upgrade-insecure-requests/, '') : value])
    .filter(([key]) => key !== 'Strict-Transport-Security'),
);
const servidor = createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, BASE).pathname);
  let archivo = join(DIST, ruta);
  if (!archivo.startsWith(DIST) || !existsSync(archivo) || ruta.endsWith('/')) archivo = join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream', ...encabezados });
  res.end(readFileSync(archivo));
});
await new Promise((ok, falla) => servidor.once('error', falla).listen(PUERTO, '127.0.0.1', ok)).catch((e) => {
  console.error(`El puerto ${PUERTO} está ocupado (${e.code}). Usa PUERTO=otro npm run revisar.`);
  process.exit(1);
});

// ——— Utilidades ———
const reporte = { fecha: new Date().toISOString(), anchos: {}, pruebas: [], consola: [] };
const fallas = [];
const prueba = (nombre, ok, detalle = '') => {
  reporte.pruebas.push({ nombre, ok, detalle });
  console.log(`${ok ? '  ✔' : '  ✘'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallas.push(nombre);
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function abrir(navegador, ancho, { ruta = '/', movil = ancho < 1024 } = {}) {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: ancho, height: movil ? 844 : 900, deviceScaleFactor: 1, isMobile: movil, hasTouch: movil });
  pagina.on('console', (m) => {
    const origen = m.location()?.url ?? '';
    if (/google|gstatic/.test(origen)) return; // ruido del iframe de Google Maps, no de la página
    if (['error', 'warn', 'warning'].includes(m.type())) reporte.consola.push(`[${ancho}] ${m.type()}: ${m.text()} ${origen}`);
  });
  pagina.on('pageerror', (e) => reporte.consola.push(`[${ancho}] pageerror: ${e.message}`));
  pagina.on('requestfailed', (r) => {
    if (!/google|gstatic/.test(r.url())) reporte.consola.push(`[${ancho}] requestfailed: ${r.url()} ${r.failure()?.errorText}`);
  });
  // La ventana de la promo sale sola una vez al día: aquí se marca como vista para que no tape lo que se revisa
  // (tiene su propio bloque de pruebas más abajo). La marca es la de promocion.ts: id de la promo y fecha de Colombia.
  if (PROMO) {
    await pagina.evaluateOnNewDocument(
      (clave, id) => localStorage.setItem(clave, `${id}|${new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10)}`),
      CLAVE_PROMO,
      PROMO.id,
    );
  }
  await pagina.goto(BASE + ruta, { waitUntil: 'networkidle0' });
  await pagina.evaluate(() => document.fonts.ready);
  return pagina;
}

/** Muestra todo lo que aparece al hacer scroll (para las capturas de página completa). */
const revelarTodo = (pagina) => pagina.evaluate(() => document.querySelectorAll('.revelar').forEach((e) => e.classList.add('revelado')));

/** Baja por toda la página (para que carguen las fotos y stickers diferidos y el mapa) y vuelve arriba. */
async function recorrer(pagina) {
  await pagina.evaluate(async () => {
    const paso = window.innerHeight * 0.8;
    for (let y = 0; y < document.documentElement.scrollHeight; y += paso) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    // Solo las visibles: una imagen diferida dentro de algo oculto (display: none) nunca se pide.
    const pendientes = [...document.images].filter((i) => !i.complete && i.offsetParent !== null);
    await Promise.race([
      Promise.all(pendientes.map((i) => new Promise((r) => (i.addEventListener('load', r), i.addEventListener('error', r))))),
      new Promise((r) => setTimeout(r, 6000)),
    ]);
  });
}

const navegador = await abrirChrome();

// ——— Por ancho: desbordes, zonas táctiles, letra mínima y capturas ———
for (const ancho of ANCHOS) {
  console.log(`\n${ancho} px`);
  const pagina = await abrir(navegador, ancho);
  await esperar(1800);
  await pagina.screenshot({ path: join(SALIDA, `${ancho}-inicio.png`) });
  await revelarTodo(pagina);
  await recorrer(pagina);
  await esperar(1500);

  // Fotos y stickers: todos cargan, con su tamaño declarado (sin saltos de diseño) y en WebP o SVG.
  const imagenes = await pagina.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter((i) => i.offsetParent !== null)
      .map((i) => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, medidas: !!i.getAttribute('width') && !!i.getAttribute('height') })),
  );
  const rotas = imagenes.filter((i) => !i.ok).map((i) => i.src.split('/').pop());
  const sinMedidas = imagenes.filter((i) => !i.medidas).map((i) => i.src.split('/').pop());
  prueba(`${ancho}: fotos y stickers cargan (${imagenes.length})`, rotas.length === 0 && sinMedidas.length === 0, [...rotas, ...sinMedidas.map((n) => `sin medidas: ${n}`)].join(' | '));
  const fotos = imagenes.filter((i) => i.src.includes('/platos/'));
  prueba(`${ancho}: fotos de las hamburguesas en WebP y en el tamaño justo`, fotos.length >= 5 && fotos.every((f) => f.src.endsWith('.webp')) && (ancho > 480 || fotos.every((f) => f.src.includes('-480'))), [...new Set(fotos.map((f) => f.src.split('/').pop()))].join(', '));

  // Rótulos: el nombre de cada hamburguesa dibujado con la letra de la carta, todos del mismo alto y sin salirse.
  const rotulos = await pagina.evaluate(() =>
    [...document.querySelectorAll('#cat-hamburguesas app-rotulo svg')].map((svg) => {
      const r = svg.getBoundingClientRect();
      const tarjeta = svg.closest('article').getBoundingClientRect();
      // `limpio`: el rótulo es un bloque en línea sin adornos heredados de otra clase (pasó una vez con .rotulo).
      const caja = svg.parentElement;
      const limpio = getComputedStyle(caja).display === 'inline-block' && ['none', 'normal'].includes(getComputedStyle(caja, '::before').content);
      return { nombre: caja.textContent.trim(), alto: Math.round(r.height), ancho: Math.round(r.width), cabe: limpio && r.left >= tarjeta.left + 8 && r.right <= tarjeta.right - 8 };
    }),
  );
  const conRotulo = MENU.platos.filter((p) => p.categoriaId === 'hamburguesas' && ROTULOS[p.id]).length;
  prueba(
    `${ancho}: los nombres de las hamburguesas van en rótulo (${conRotulo}), del mismo alto y dentro de la tarjeta`,
    rotulos.length === conRotulo && conRotulo > 0 && new Set(rotulos.map((r) => r.alto)).size === 1 && rotulos.every((r) => r.cabe && r.alto >= 48),
    rotulos.map((r) => `${r.nombre} ${r.ancho}x${r.alto}${r.cabe ? '' : ' (se sale)'}`).join(' | '),
  );

  const medidas = await pagina.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[aria-hidden="true"], .solo-impresion, dialog:not([open])');
    };
    // Recortado por algún contenedor con scroll u overflow oculto que sí cabe en pantalla (carruseles, cintas).
    const recortado = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (getComputedStyle(p).overflowX === 'visible') continue;
        const r = p.getBoundingClientRect();
        if (r.left >= -1 && r.right <= vw + 1) return true;
      }
      return false;
    };
    const desbordes = [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > vw + 1 || r.left < -1) && !recortado(el) && !el.closest('.brasas, [aria-hidden="true"]');
      })
      .slice(0, 8)
      .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 3).join('.')} (${Math.round(el.getBoundingClientRect().left)}→${Math.round(el.getBoundingClientRect().right)})`);

    const tactiles = [...document.querySelectorAll('a[href], button, input, select, textarea, [role="button"]')]
      .filter((el) => visible(el) && !el.matches('.sr-only, [class*="-translate-y-20"]'))
      .map((el) => {
        // Los nombres de los platos se estiran con ::after a toda la tarjeta: cuenta la tarjeta.
        const r = (el.matches('[class~="after:inset-0"]') ? el.closest('article') : el).getBoundingClientRect();
        return { el, w: r.width, h: r.height };
      })
      .filter(({ w, h }) => Math.min(w, h) < 40)
      .map(({ el, w, h }) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}" ${Math.round(w)}x${Math.round(h)}`);

    const letraChica = [...document.querySelectorAll('body *')]
      .filter((el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 11 && !el.closest('svg'))
      .slice(0, 8)
      .map((el) => `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 24)}" ${getComputedStyle(el).fontSize}`);

    return { scrollHorizontal: document.documentElement.scrollWidth > vw, anchoDocumento: document.documentElement.scrollWidth, vw, desbordes, tactiles, letraChica };
  });
  reporte.anchos[ancho] = medidas;
  prueba(`${ancho}: sin scroll horizontal`, !medidas.scrollHorizontal && medidas.desbordes.length === 0, medidas.desbordes.join(' | '));
  prueba(`${ancho}: zonas táctiles ≥ 40 px`, medidas.tactiles.length === 0, medidas.tactiles.slice(0, 6).join(' | '));
  prueba(`${ancho}: letra ≥ 11 px`, medidas.letraChica.length === 0, medidas.letraChica.join(' | '));

  await pagina.screenshot({ path: join(SALIDA, `${ancho}-completa.png`), fullPage: true });
  await pagina.close();
}

// ——— Funcionamiento (celular y escritorio) ———
for (const ancho of [390, 1440]) {
  console.log(`\nFuncionamiento a ${ancho} px`);
  const pagina = await abrir(navegador, ancho);
  const titulos = () => pagina.$$eval('#menu [data-seccion] h4', (hs) => hs.map((h) => h.textContent.trim()));
  const total = (await titulos()).length;

  // Búsqueda
  await pagina.$eval('#buscador', (el) => el.focus());
  await pagina.keyboard.type('queso', { delay: 20 });
  await esperar(150);
  const conQueso = (await titulos()).length;
  prueba(`${ancho}: búsqueda "queso"`, conQueso > 0 && conQueso < total, `${conQueso} de ${total}`);
  // Seleccionar con select(): un clic podría caer en la barra fija de abajo.
  const reescribir = async (texto) => {
    await pagina.$eval('#buscador', (el) => (el.focus(), el.select()));
    await pagina.keyboard.type(texto);
  };
  await reescribir('plátano');
  await esperar(150);
  prueba(`${ancho}: búsqueda con tilde "plátano"`, (await titulos()).join() === 'La Madurita', (await titulos()).join());
  await reescribir('sushi');
  await esperar(150);
  const vacio = await pagina.$eval('#menu', (m) => m.textContent.includes('Nada por aquí'));
  prueba(`${ancho}: sin resultados muestra el aviso`, vacio);
  if (ancho === 390) await pagina.screenshot({ path: join(SALIDA, `${ancho}-sin-resultados.png`) });
  await pagina.keyboard.press('Escape');
  await esperar(150);
  prueba(`${ancho}: Escape borra la búsqueda`, (await titulos()).length === total);

  // Filtros
  const filtro = async (texto) =>
    pagina.evaluate((t) => [...document.querySelectorAll('[aria-label="Filtros"] button')].find((b) => b.textContent.includes(t))?.click(), texto);
  const chips = await pagina.$eval('[aria-label="Filtros"]', (f) => f.textContent);
  prueba(`${ancho}: sin filtros de dieta que no traerían platos`, !/Vegetariano|Picante|Sin gluten/.test(chips), chips.replace(/\s+/g, ' ').trim());
  await filtro('Hasta');
  await esperar(150);
  const bajos = nombres(MENU.platos.filter((p) => p.precio <= corteBajo));
  prueba(`${ancho}: filtro "Hasta"`, (await titulos()).join() === bajos.join(), (await titulos()).join(', '));
  await filtro('Más de');
  await esperar(150);
  const altos = nombres(MENU.platos.filter((p) => p.precio > corteAlto));
  prueba(`${ancho}: filtro "Más de"`, (await titulos()).join() === altos.join(), (await titulos()).join(', '));
  await pagina.$eval('#buscador', (el) => (el.focus(), el.select()));
  await pagina.keyboard.type('maduro');
  await esperar(150);
  prueba(`${ancho}: filtro de precio + búsqueda se combinan`, (await titulos()).join() === 'La Madurita', (await titulos()).join(', '));
  await pagina.keyboard.press('Escape');
  if (ancho === 390) await pagina.screenshot({ path: join(SALIDA, `${ancho}-filtro-precio.png`) });
  await pagina.evaluate(() => [...document.querySelectorAll('#menu button')].find((b) => b.textContent.includes('Limpiar filtros'))?.click());
  await esperar(150);

  // Barra de categorías
  await pagina.evaluate(() => document.querySelector('[data-categoria="bebidas"]').click());
  // El desplazamiento suave tarda según lo larga que sea la página: se espera a que se quede quieto.
  await pagina.evaluate(async () => {
    for (let quieto = 0, antes = -1; quieto < 4; antes = scrollY) {
      await new Promise((r) => setTimeout(r, 120));
      quieto = scrollY === antes ? quieto + 1 : 0;
    }
  });
  await esperar(200);
  const categoria = await pagina.evaluate(() => {
    const seccion = document.getElementById('cat-bebidas').getBoundingClientRect();
    const barra = document.querySelector('nav[aria-label="Categorías del menú"]').getBoundingClientRect();
    return { arriba: Math.round(seccion.top), barraAbajo: Math.round(barra.bottom), activa: document.querySelector('[data-categoria].activo')?.dataset.categoria };
  });
  prueba(`${ancho}: categoría "Bebidas" queda bajo la barra pegajosa`, categoria.arriba >= categoria.barraAbajo - 2 && categoria.arriba < categoria.barraAbajo + 80, JSON.stringify(categoria));
  prueba(`${ancho}: la barra resalta la categoría visible`, categoria.activa === 'bebidas', String(categoria.activa));
  await pagina.screenshot({ path: join(SALIDA, `${ancho}-categorias.png`) });

  // Detalle del plato
  await pagina.evaluate(() => window.scrollTo(0, document.getElementById('cat-hamburguesas').offsetTop - 140));
  await esperar(500);
  await pagina.evaluate(() => document.querySelector('#cat-hamburguesas h4 button').click());
  await esperar(700);
  const detalle = await pagina.evaluate(() => {
    const d = document.querySelector('dialog.hoja');
    return {
      abierto: d.open,
      titulo: d.querySelector('h2')?.textContent.trim(),
      ingredientes: d.textContent.includes('Ingredientes'),
      adiciones: d.textContent.includes('Adiciones'),
      tiquetes: d.querySelectorAll('.tiquete').length,
      url: location.search,
      foco: document.activeElement?.getAttribute('aria-label'),
    };
  });
  prueba(`${ancho}: el detalle abre con ingredientes, adiciones y precios sola/combo`, detalle.abierto && detalle.ingredientes && detalle.adiciones && detalle.tiquetes === 2, `${detalle.titulo} ${detalle.url}`);
  prueba(`${ancho}: el foco pasa al detalle`, detalle.foco === 'Cerrar detalle', String(detalle.foco));
  await pagina.screenshot({ path: join(SALIDA, `${ancho}-detalle.png`) });
  await pagina.keyboard.press('Escape');
  await esperar(600);
  const cerrado = await pagina.evaluate(() => ({ abierto: document.querySelector('dialog.hoja').open, url: location.search, foco: document.activeElement?.textContent?.trim() }));
  prueba(`${ancho}: Escape cierra y limpia la URL`, !cerrado.abierto && cerrado.url === '', JSON.stringify(cerrado));
  prueba(`${ancho}: el foco vuelve al plato`, !!cerrado.foco && cerrado.foco.length < 40, String(cerrado.foco));

  // "Atrás" del navegador cierra el detalle sin salir de la página
  await pagina.evaluate(() => document.querySelectorAll('#cat-hamburguesas h4 button')[1].click());
  await esperar(600);
  await pagina.goBack();
  await esperar(600);
  const trasAtras = await pagina.evaluate(() => ({ abierto: document.querySelector('dialog.hoja').open, url: location.href }));
  prueba(`${ancho}: "atrás" cierra el detalle y sigue en la página`, !trasAtras.abierto && trasAtras.url.startsWith(BASE), trasAtras.url);

  // Tarjetas de color con tiquetes (hamburguesas) y panel en lista (adiciones y bebidas)
  const estilos = await pagina.evaluate(() => ({
    tiquetes: document.querySelectorAll('#cat-hamburguesas .tiquete').length,
    colores: new Set([...document.querySelectorAll('#cat-hamburguesas article')].map((a) => getComputedStyle(a).backgroundColor)).size,
    listas: document.querySelectorAll('app-lista-platos').length,
  }));
  const conCombo = MENU.platos.filter((p) => p.precioCombo).length;
  prueba(`${ancho}: hamburguesas en tarjetas de color con tiquetes sola/combo`, estilos.tiquetes === conCombo * 2 && estilos.colores >= 4, JSON.stringify(estilos));
  prueba(`${ancho}: adiciones y bebidas en lista`, estilos.listas === 2, JSON.stringify(estilos));
  await pagina.close();

  // Mapa: carga dentro de la CSP, con el sticker de la marca sobre el punto; "Explorar" lo desbloquea
  const mapaPagina = await abrir(navegador, ancho);
  await mapaPagina.evaluate(() => document.getElementById('visitanos').scrollIntoView({ behavior: 'instant' }));
  await mapaPagina.waitForSelector('#visitanos iframe', { timeout: 15000 }).catch(() => {});
  await mapaPagina.waitForSelector('#visitanos .marcador', { timeout: 20000 }).catch(() => {});
  await esperar(2500);
  const mapa = await mapaPagina.evaluate(() => {
    const marco = document.querySelector('#visitanos iframe');
    const marcador = document.querySelector('#visitanos .marcador');
    if (!marco || !marcador) return { marco: !!marco, marcador: !!marcador };
    const c = marco.getBoundingClientRect();
    const m = marcador.getBoundingClientRect();
    return {
      marco: true,
      marcador: true,
      bloqueado: getComputedStyle(marco).pointerEvents === 'none',
      // La base del sticker debe quedar en el centro del mapa (donde Google pinta su pin).
      desfaseX: Math.round(m.left + m.width / 2 - (c.left + c.width / 2)),
      desfaseY: Math.round(m.bottom - (c.top + c.height / 2)),
    };
  });
  prueba(`${ancho}: el mapa carga con el sticker de la marca en el punto exacto`, mapa.marco && mapa.marcador && mapa.bloqueado && Math.abs(mapa.desfaseX) <= 2 && Math.abs(mapa.desfaseY) <= 12, JSON.stringify(mapa));
  await mapaPagina.screenshot({ path: join(SALIDA, `${ancho}-mapa.png`) });
  await mapaPagina.evaluate(() => [...document.querySelectorAll('#visitanos button')].find((b) => b.textContent.includes('Explorar'))?.click());
  await esperar(300);
  const explorando = await mapaPagina.evaluate(() => ({
    marcador: !!document.querySelector('#visitanos .marcador'),
    eventos: getComputedStyle(document.querySelector('#visitanos iframe')).pointerEvents,
  }));
  prueba(`${ancho}: "Explorar el mapa" lo desbloquea y quita el sticker`, !explorando.marcador && explorando.eventos !== 'none', JSON.stringify(explorando));
  await mapaPagina.close();

  // Enlace compartido
  const compartido = await abrir(navegador, ancho, { ruta: '/?plato=root-burger' });
  await esperar(900);
  const abiertoDesdeEnlace = await compartido.evaluate(() => ({ abierto: document.querySelector('dialog.hoja').open, titulo: document.querySelector('dialog.hoja h2')?.textContent.trim() }));
  prueba(`${ancho}: ?plato=root-burger abre el detalle`, abiertoDesdeEnlace.abierto && abiertoDesdeEnlace.titulo === 'Root Burger', JSON.stringify(abiertoDesdeEnlace));
  await compartido.close();
}

// ——— Horario: con horas, festivos y el mismo estado en el inicio y en Visítanos ———
{
  const pagina = await abrir(navegador, 390);
  const horario = await pagina.evaluate(() => ({
    filas: [...document.querySelectorAll('#visitanos dl > div')].map((f) => f.textContent.replace(/\s+/g, ' ').trim()),
    nota: document.querySelector('#visitanos dl + p')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
    inicio: document.querySelector('#inicio app-estado-negocio').textContent.replace(/\s+/g, ' ').trim(),
  }));
  const conHoras = horario.filas.filter((f) => /\d\sp\.\sm\./.test(f)).length;
  prueba('horario: los días de atención traen sus horas y ninguno queda "por confirmar"', conHoras >= 4 && horario.filas.length === 7 && !horario.filas.some((f) => /confirmar/.test(f)), horario.filas.join(' | '));
  prueba('horario: avisa que los festivos también se atiende', /festivos/.test(horario.nota) && /\d\sp\.\sm\./.test(horario.nota), horario.nota);
  prueba('inicio: el estado del local ya no dice "por confirmar"', !!horario.inicio && !/confirmar/.test(horario.inicio), horario.inicio);
  await pagina.evaluate(() => document.querySelector('#visitanos dl').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await pagina.evaluate(() => document.querySelectorAll('.revelar').forEach((e) => e.classList.add('revelado')));
  await esperar(900);
  await pagina.screenshot({ path: join(SALIDA, '390-horario.png') });
  await pagina.close();
}

// ——— Promo del mes: la ventana sale sola una vez al día, con el afiche ya cargado, y se puede reabrir ———
if (PROMO) {
  for (const ancho of [360, 390, 1440]) {
    console.log(`\nPromo a ${ancho} px`);
    const movil = ancho < 1024;
    const alto = ancho === 360 ? 640 : movil ? 844 : 900;
    const pagina = await navegador.newPage();
    await pagina.setViewport({ width: ancho, height: alto, deviceScaleFactor: 1, isMobile: movil, hasTouch: movil });
    pagina.on('console', (m) => ['error', 'warn', 'warning'].includes(m.type()) && reporte.consola.push(`[promo ${ancho}] ${m.type()}: ${m.text()}`));
    pagina.on('pageerror', (e) => reporte.consola.push(`[promo ${ancho}] pageerror: ${e.message}`));
    // Primera visita del día: se borra la marca de "ya la vio" y se vuelve a entrar.
    await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pagina.evaluate((clave) => localStorage.removeItem(clave), CLAVE_PROMO);
    await pagina.goto(BASE, { waitUntil: 'networkidle0' });
    const salio = await pagina.waitForSelector('dialog.promo[open]', { timeout: 9000 }).then(() => true, () => false);
    await esperar(700);
    const ventana = salio
      ? await pagina.evaluate(() => {
          const d = document.querySelector('dialog.promo');
          const afiche = d.querySelector('img.promo-afiche');
          const marco = d.querySelector('.promo-marco').getBoundingClientRect();
          const a = afiche.getBoundingClientRect();
          const visible = (el) => el.getBoundingClientRect().width > 4 && el.getBoundingClientRect().height > 4;
          return {
            afiche: afiche.complete && afiche.naturalWidth > 0,
            archivo: afiche.currentSrc.split('/').pop(),
            proporcion: +(a.height / a.width).toFixed(2),
            cabe: marco.left >= 8 && marco.top >= 8 && marco.right <= innerWidth - 8 && marco.bottom <= innerHeight - 8,
            medidas: `${Math.round(marco.width)}x${Math.round(marco.height)} en ${innerWidth}x${innerHeight}`,
            foco: document.activeElement?.id,
            nota: [...d.querySelectorAll('.promo-nota, #promo-nota')].filter(visible).map((n) => `${n.textContent.trim().slice(0, 28)}… ${getComputedStyle(n).fontSize}`),
            nombre: document.getElementById(d.getAttribute('aria-labelledby'))?.textContent.replace(/\s+/g, ' ').trim(),
            textoALaVista: visible(d.querySelector('.promo-texto')),
            botones: [...d.querySelectorAll('.promo-acciones a, .promo-acciones button')].map((b) => ({ texto: b.textContent.trim(), alto: Math.round(b.getBoundingClientRect().height), ancho: Math.round(b.getBoundingClientRect().width), desborda: b.scrollWidth > b.clientWidth + 1, href: b.getAttribute('href') })),
            alt: afiche.alt,
            fondoQuieto: getComputedStyle(document.documentElement).overflowY === 'hidden',
          };
        })
      : null;
    prueba(`promo ${ancho}: la ventana sale sola en la primera visita del día`, salio);
    if (ventana) {
      prueba(`promo ${ancho}: el afiche ya está cargado, sin deformar, y la ventana cabe en la pantalla`, ventana.afiche && ventana.cabe && Math.abs(ventana.proporcion - PROMO.afiche.alto / PROMO.afiche.ancho) < 0.02, `${ventana.archivo}, ${ventana.medidas}, proporción ${ventana.proporcion}`);
      prueba(`promo ${ancho}: en celular baja el afiche liviano`, !movil || ventana.archivo === PROMO.afiche.pequena?.src.split('/').pop(), ventana.archivo);
      prueba(`promo ${ancho}: el foco pasa al título de la promo y la ventana tiene nombre`, ventana.foco === 'promo-titulo' && ventana.nombre?.includes(PROMO.titulo) && !/por\$/.test(ventana.nombre) && ventana.alt.length > 20 && ventana.fondoQuieto, `${ventana.foco} · ${ventana.nombre}`);
      prueba(`promo ${ancho}: las condiciones se leen en texto (no solo dentro del afiche)`, !PROMO.nota || (ventana.nota.length === 1 && parseFloat(ventana.nota[0].split(' ').pop()) >= 12), ventana.nota.join(' | '));
      prueba(`promo ${ancho}: ${movil ? 'afiche y botones (la promo en texto queda para el lector de pantalla)' : 'afiche a la izquierda y la promo en texto a la derecha'}`, ventana.textoALaVista === !movil);
      prueba(`promo ${ancho}: botones cómodos y sin texto cortado`, ventana.botones.length >= 1 && ventana.botones.every((b) => b.alto >= 44 && !b.desborda), ventana.botones.map((b) => `${b.texto} ${b.ancho}x${b.alto}`).join(' | '));
      const whatsapp = ventana.botones.find((b) => b.href?.startsWith('https://wa.me/'));
      prueba(`promo ${ancho}: el botón de WhatsApp lleva el mensaje de la promo`, !CLIENTE.contacto.whatsapp.activo || (!!whatsapp && decodeURIComponent(whatsapp.href).includes(PROMO.mensajeWhatsApp ?? PROMO.titulo)), whatsapp?.href ?? '');
      await pagina.screenshot({ path: join(SALIDA, `${ancho}-promo.png`) });

      await pagina.keyboard.press('Escape');
      await esperar(500);
      prueba(`promo ${ancho}: Escape la cierra`, await pagina.$eval('dialog.promo', (d) => !d.open));

      // Misma visita, más tarde: ya no sale sola.
      await pagina.reload({ waitUntil: 'networkidle0' });
      await esperar(3200);
      prueba(`promo ${ancho}: no vuelve a salir sola el mismo día`, await pagina.$eval('dialog.promo', (d) => !d.open));

      // El botón del inicio la reabre; "Ver el menú" la cierra y baja al menú.
      await pagina.screenshot({ path: join(SALIDA, `${ancho}-inicio-promo.png`) });
      await pagina.evaluate(() => document.querySelector('#inicio button[aria-haspopup="dialog"]').click());
      await esperar(600);
      const reabierta = await pagina.$eval('dialog.promo', (d) => d.open);
      await pagina.evaluate(() => [...document.querySelectorAll('dialog.promo .promo-acciones a')].find((a) => a.getAttribute('href') === '#menu').click());
      await esperar(1400);
      const alMenu = await pagina.evaluate(() => ({ abierta: document.querySelector('dialog.promo').open, hash: location.hash, arriba: Math.round(document.getElementById('menu').getBoundingClientRect().top) }));
      prueba(`promo ${ancho}: el botón del inicio la reabre y "Ver el menú" la cierra y baja al menú`, reabierta && !alMenu.abierta && alMenu.hash === '#menu' && alMenu.arriba < alto, JSON.stringify(alMenu));
    }
    await pagina.close();
  }

  // Con un plato compartido manda el plato: la promo no se le atraviesa.
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pagina.evaluate((clave) => localStorage.removeItem(clave), CLAVE_PROMO);
  await pagina.goto(`${BASE}/?plato=root-burger`, { waitUntil: 'networkidle0' });
  await esperar(3200);
  const conPlato = await pagina.evaluate(() => ({ promo: document.querySelector('dialog.promo').open, detalle: document.querySelector('dialog.hoja').open }));
  prueba('promo: con un plato compartido (?plato=…) no sale sola', !conPlato.promo && conPlato.detalle, JSON.stringify(conPlato));
  await pagina.close();
}

// ——— Sello de la promo en la tarjeta de su plato, rótulos de categorías y enlace directo ?promo ———
if (PROMO) {
  const pagina = await abrir(navegador, 390);
  const sello = await pagina.evaluate(() => [...document.querySelectorAll('#cat-hamburguesas article')].filter((a) => a.querySelector('p.-rotate-6')).map((a) => a.querySelector('h4').textContent.trim()));
  prueba('promo: la tarjeta del plato de la promo lleva el sello', !PROMO.platoId || (sello.length === 1 && sello[0] === MENU.platos.find((p) => p.id === PROMO.platoId)?.nombre), JSON.stringify(sello));
  await pagina.close();

  // Enlace directo: abre la ventana aunque ya haya salido hoy y limpia la dirección.
  const directa = await abrir(navegador, 390, { ruta: '/?promo' });
  const abrio = await directa.waitForSelector('dialog.promo[open]', { timeout: 6000 }).then(() => true, () => false);
  prueba('enlace ?promo: abre la ventana de la promo y quita el parámetro de la dirección', abrio && !(await directa.evaluate(() => location.search.includes('promo'))), await directa.evaluate(() => location.href));
  await directa.close();
}
{
  const pagina = await abrir(navegador, 390);
  const categorias = await pagina.evaluate(() =>
    ['adiciones', 'bebidas'].map((id) => {
      const s = document.getElementById(`cat-${id}`);
      const dibujo = s.querySelector('app-lista-platos app-rotulo svg')?.getBoundingClientRect();
      return { id, titulo: s.querySelector('h3')?.textContent.trim(), oculto: s.querySelector('header').classList.contains('sr-only'), alto: Math.round(dibujo?.height ?? 0), ancho: Math.round(dibujo?.width ?? 0) };
    }),
  );
  prueba('rótulos de categorías: Adiciones y Bebidas van dibujados dentro de su panel y conservan el título como texto', categorias.every((c) => c.alto >= 40 && c.ancho > 80 && c.oculto && c.titulo), JSON.stringify(categorias));
  const cierre = await pagina.evaluate(() => {
    const r = document.querySelector('app-pie app-rotulo');
    return { texto: r?.textContent.trim(), ancho: Math.round(r?.querySelector('svg')?.getBoundingClientRect().width ?? 0) };
  });
  prueba('rótulo de cierre: la frase del pie va con la letra de la carta', cierre.ancho > 150 && cierre.texto === `${CLIENTE.cierre}.`, JSON.stringify(cierre));
  await pagina.evaluate(() => document.getElementById('cat-adiciones').scrollIntoView({ behavior: 'instant', block: 'start' }));
  await pagina.evaluate(() => window.scrollBy(0, -130));
  await pagina.evaluate(() => document.querySelectorAll('.revelar').forEach((e) => e.classList.add('revelado')));
  await esperar(900);
  await pagina.screenshot({ path: join(SALIDA, '390-listas.png') });
  await pagina.evaluate(() => document.querySelector('app-pie app-rotulo').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await esperar(700);
  await pagina.screenshot({ path: join(SALIDA, '390-pie.png') });
  await pagina.close();
}

// ——— Pedido por WhatsApp: elegir en el detalle, agregar, cambiar cantidades, usar la promo y enviar ———
if (PEDIDOS) {
  const hamburguesa = MENU.platos.find((p) => p.precioCombo);
  const adicion = MENU.platos.find((p) => p.categoriaId === 'adiciones');
  const lado = MENU.acompanamientosCombo?.[1] ?? MENU.acompanamientosCombo?.[0] ?? '';
  for (const ancho of [390, 1440]) {
    console.log(`\nPedido a ${ancho} px`);
    const pagina = await abrir(navegador, ancho);
    await pagina.evaluate((clave) => localStorage.removeItem(clave), CLAVE_PEDIDO);
    await pagina.reload({ waitUntil: 'networkidle0' });
    const barra = () => pagina.evaluate(() => document.querySelector('app-pedido-barra button')?.textContent.replace(/\s+/g, ' ').trim() ?? '');
    prueba(`pedido ${ancho}: sin nada agregado no hay barra`, (await barra()) === '');

    // En el detalle: en combo, con el segundo acompañamiento, dos unidades.
    await pagina.evaluate(() => document.getElementById('cat-hamburguesas').scrollIntoView({ behavior: 'instant' }));
    await pagina.evaluate(() => document.querySelector('#cat-hamburguesas h4 button').click());
    await esperar(700);
    const enDetalle = (texto) => pagina.evaluate((t) => [...document.querySelectorAll('dialog.hoja:not(.pedido) button')].find((b) => b.textContent.replace(/\s+/g, ' ').trim().startsWith(t))?.click(), texto);
    await enDetalle('En combo');
    await esperar(150);
    if (lado) await enDetalle(lado);
    await pagina.evaluate(() => document.querySelector('dialog.hoja:not(.pedido) app-cantidad button:last-of-type').click());
    await esperar(150);
    const pie = await pagina.evaluate(() => {
      const zona = document.querySelector('dialog.hoja:not(.pedido) .sticky');
      const r = zona.getBoundingClientRect();
      return { texto: zona.textContent.replace(/\s+/g, ' ').trim(), aLaVista: r.top >= 0 && r.bottom <= innerHeight + 1, opciones: [...document.querySelectorAll('dialog.hoja:not(.pedido) .opcion[aria-pressed="true"]')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()) };
    });
    prueba(`pedido ${ancho}: en el detalle se elige en combo, el acompañamiento y la cantidad, con el total a la vista`, pie.aLaVista && pie.texto.replace(/\s/g, ' ').includes(pesos(hamburguesa.precioCombo * 2)) && pie.opciones.length === (lado ? 2 : 1), JSON.stringify(pie));
    await pagina.screenshot({ path: join(SALIDA, `${ancho}-pedido-detalle.png`) });
    await enDetalle('Agregar');
    await esperar(700);
    const trasAgregar = { detalle: await pagina.$eval('dialog.hoja:not(.pedido)', (d) => d.open), barra: await barra() };
    prueba(`pedido ${ancho}: al agregar se cierra el detalle y aparece la barra con unidades y total`, !trasAgregar.detalle && trasAgregar.barra.startsWith('Ver pedido 2') && trasAgregar.barra.replace(/\s/g, ' ').includes(pesos(hamburguesa.precioCombo * 2)), trasAgregar.barra);

    // Desde la lista de adiciones: un toque en "+".
    await pagina.evaluate(() => document.querySelector('#cat-adiciones li button').click());
    await esperar(300);
    prueba(`pedido ${ancho}: el "+" de las listas agrega de una y la fila muestra cuántas van`, (await barra()).startsWith('Ver pedido 3') && (await pagina.$eval('#cat-adiciones li button', (b) => b.getAttribute('aria-label'))).includes('llevas 1'), await barra());
    await pagina.screenshot({ path: join(SALIDA, `${ancho}-pedido-barra.png`) });

    // "Tu pedido"
    await pagina.evaluate(() => document.querySelector('app-pedido-barra button').click());
    await esperar(700);
    const leer = () =>
      pagina.evaluate(() => {
        const d = document.querySelector('dialog.pedido');
        const panel = d.querySelector('.hoja-panel')?.getBoundingClientRect();
        return {
          abierto: d.open,
          foco: document.activeElement?.getAttribute('aria-label'),
          lineas: [...d.querySelectorAll('ul > li')].map((li) => li.querySelector('div').textContent.replace(/\s+/g, ' ').trim()),
          total: d.querySelector('footer strong')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
          enlace: decodeURIComponent(d.querySelector('footer a[href^="https://wa.me/"]')?.getAttribute('href') ?? ''),
          promo: [...d.querySelectorAll('button')].some((b) => b.textContent.includes('Usar la promo')),
          cabe: !!panel && panel.left >= 0 && panel.right <= innerWidth && panel.top >= 0 && panel.bottom <= innerHeight + 1,
          campo: parseFloat(getComputedStyle(d.querySelector('textarea') ?? d).fontSize),
        };
      });
    let pedido = await leer();
    const total1 = hamburguesa.precioCombo * 2 + adicion.precio;
    prueba(`pedido ${ancho}: "Tu pedido" lista lo agregado con su total y cabe en la pantalla`, pedido.abierto && pedido.cabe && pedido.lineas.length === 2 && pedido.lineas[0].includes(hamburguesa.nombre) && pedido.lineas[0].includes(lado || 'En combo') && pedido.total.replace(/\s/g, ' ') === pesos(total1) && pedido.foco === 'Cerrar el pedido' && pedido.campo >= 15, JSON.stringify({ lineas: pedido.lineas, total: pedido.total, foco: pedido.foco }));
    prueba(`pedido ${ancho}: el enlace de WhatsApp lleva los productos, el total y la entrega`, pedido.enlace.startsWith(`https://wa.me/${CLIENTE.contacto.whatsapp.numero}?text=`) && pedido.enlace.includes(`2 x ${hamburguesa.nombre}`) && pedido.enlace.includes(`*Total: ${pesos(total1)}*`) && pedido.enlace.includes('Entrega: A domicilio'), pedido.enlace.replace(/\n/g, ' ⏎ ').slice(0, 260));
    await pagina.screenshot({ path: join(SALIDA, `${ancho}-pedido.png`) });

    // Dos combos del plato de la promo: sugiere cambiarlos por la promo.
    if (PROMO?.platoId === hamburguesa.id && PROMO.cantidad === 2) {
      prueba(`pedido ${ancho}: con dos combos del plato de la promo, ofrece usarla`, pedido.promo);
      await pagina.evaluate(() => [...document.querySelectorAll('dialog.pedido button')].find((b) => b.textContent.includes('Usar la promo')).click());
      await esperar(300);
      pedido = await leer();
      prueba(`pedido ${ancho}: "Usar la promo" cambia los dos combos por la promo y baja el total`, pedido.lineas.some((l) => l.includes(PROMO.titulo)) && !pedido.lineas.some((l) => l.includes('En combo')) && pedido.total.replace(/\s/g, ' ') === pesos(PROMO.precio + adicion.precio) && !pedido.promo, JSON.stringify({ lineas: pedido.lineas, total: pedido.total }));
    }

    // Entrega, nota y cantidades
    await pagina.evaluate(() => [...document.querySelectorAll('dialog.pedido .opcion')].find((b) => b.textContent.includes('recogerlo')).click());
    await pagina.$eval('dialog.pedido textarea', (t) => t.focus());
    await pagina.keyboard.type('sin pepinillos');
    await esperar(200);
    pedido = await leer();
    prueba(`pedido ${ancho}: la entrega y la nota van en el mensaje`, pedido.enlace.includes('Entrega: Paso a recogerlo en el local') && pedido.enlace.includes('Nota: sin pepinillos'), pedido.enlace.split('\n').slice(-2).join(' ⏎ '));
    const antes = pedido.lineas.length;
    await pagina.evaluate(() => document.querySelector('dialog.pedido ul > li:last-child app-cantidad button').click());
    await esperar(300);
    pedido = await leer();
    prueba(`pedido ${ancho}: restar hasta cero quita la línea`, pedido.lineas.length === antes - 1, JSON.stringify(pedido.lineas));

    // Sigue ahí al recargar; vaciar lo borra.
    await pagina.keyboard.press('Escape');
    await esperar(500);
    await pagina.reload({ waitUntil: 'networkidle0' });
    await esperar(400);
    prueba(`pedido ${ancho}: el pedido sigue ahí al recargar la página`, (await barra()).startsWith('Ver pedido'), await barra());
    await pagina.evaluate(() => document.querySelector('app-pedido-barra button').click());
    await esperar(600);
    await pagina.evaluate(() => [...document.querySelectorAll('dialog.pedido button')].find((b) => b.textContent.includes('Vaciar')).click());
    await esperar(300);
    const vacio = await pagina.evaluate((clave) => ({ texto: document.querySelector('dialog.pedido').textContent.includes('no hay nada'), guardado: localStorage.getItem(clave) }), CLAVE_PEDIDO);
    prueba(`pedido ${ancho}: "Vaciar el pedido" lo deja vacío y borra lo guardado`, vacio.texto && vacio.guardado === null && (await barra()) === '', JSON.stringify(vacio));
    await pagina.close();
  }
}

// ——— La mascota del inicio sigue el mouse con los ojos (solo con mouse; en celular no hay puntero) ———
{
  const pagina = await abrir(navegador, 1440);
  await esperar(1500);
  const mirada = () => pagina.$eval('#inicio app-mascota svg g g[transform]', (g) => g.getAttribute('transform'));
  const centro = await pagina.$eval('#inicio app-mascota', (el) => {
    const c = el.getBoundingClientRect();
    return { x: c.left + c.width / 2, y: c.top + c.height / 2 };
  });
  await pagina.mouse.move(centro.x - 500, centro.y - 250);
  await esperar(150);
  const izquierda = await mirada();
  await pagina.mouse.move(centro.x + 180, centro.y + 260);
  await esperar(150);
  const derecha = await mirada();
  const x = (t) => Number(t.match(/translate\((-?[\d.]+)/)?.[1]);
  prueba('la mascota del inicio sigue el mouse con los ojos', x(izquierda) < -1 && x(derecha) > 0.5, `${izquierda} → ${derecha}`);
  const barra = await pagina.$eval('header app-mascota', (el) => el.getBoundingClientRect().width > 30);
  prueba('la mascota está en la barra de arriba', barra);
  await pagina.close();
}

// ——— Movimiento reducido ———
{
  const pagina = await navegador.newPage();
  await pagina.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await pagina.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await pagina.goto(BASE, { waitUntil: 'networkidle0' });
  const animado = await pagina.evaluate(() => ({
    brasas: getComputedStyle(document.querySelector('.brasas')).display,
    revelar: getComputedStyle(document.querySelector('.revelar')).opacity,
  }));
  prueba('movimiento reducido: sin chispas y sin aparición animada', animado.brasas === 'none' && animado.revelar === '1', JSON.stringify(animado));
  await pagina.close();
}

// ——— Sin conexión (PWA) ———
{
  console.log('\nSin conexión');
  const pagina = await abrir(navegador, 390);
  const listo = await pagina
    .evaluate(async () => {
      const registro = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 40000))]);
      return !!registro?.active;
    })
    .catch(() => false);
  prueba('el service worker se instala', listo);
  if (listo) {
    // Espera a que el service worker guarde los archivos de la app.
    for (let i = 0; i < 30; i++) {
      const guardados = await pagina.evaluate(async () => (await caches.keys()).some((k) => k.includes(':assets:app:cache')));
      if (guardados) break;
      await esperar(500);
    }
    await esperar(1500);
    await pagina.setOfflineMode(true);
    await pagina.reload({ waitUntil: 'domcontentloaded' });
    await esperar(1500);
    const sinRed = await pagina.evaluate(() => ({ platos: document.querySelectorAll('#menu [data-seccion] h4').length, aviso: document.body.textContent.includes('Sin conexión') }));
    prueba('el menú abre sin conexión', sinRed.platos > 0, `${sinRed.platos} platos, aviso: ${sinRed.aviso}`);
    await pagina.screenshot({ path: join(SALIDA, '390-sin-conexion.png') });
    await pagina.setOfflineMode(false);
  }
  await pagina.close();
}

// ——— Impresión ———
{
  const pagina = await abrir(navegador, 1024, { movil: false });
  await pagina.emulateMediaType('print');
  await pagina.pdf({ path: join(SALIDA, 'menu-impreso.pdf'), format: 'A4', printBackground: true });
  const impreso = await pagina.evaluate(() => ({
    menu: getComputedStyle(document.querySelector('app-menu-impreso')).display,
    principal: getComputedStyle(document.querySelector('main')).display,
  }));
  prueba('impresión: solo la carta', impreso.menu === 'block' && impreso.principal === 'none', JSON.stringify(impreso));
  await pagina.close();
}

await navegador.close();
servidor.close();

const errores = reporte.consola.filter((l) => !l.includes('requestfailed: https://www.google.com'));
prueba('consola sin errores ni avisos', errores.length === 0, errores.slice(0, 6).join(' | '));
writeFileSync(join(SALIDA, 'reporte.json'), JSON.stringify(reporte, null, 2));
console.log(`\n${reporte.pruebas.length - fallas.length} de ${reporte.pruebas.length} pruebas OK. Capturas y reporte en revision/`);
process.exit(fallas.length ? 1 : 0);
