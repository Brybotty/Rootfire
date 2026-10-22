// Abre el Chrome instalado en el equipo con puppeteer-core (no descarga otro navegador).
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const RUTAS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);

export function rutaChrome() {
  const ruta = RUTAS.find((r) => existsSync(r));
  if (!ruta) throw new Error('No encontré Chrome. Define CHROME_PATH con la ruta de chrome.exe.');
  return ruta;
}

export function abrirChrome() {
  return puppeteer.launch({ executablePath: rutaChrome(), headless: true, args: ['--no-first-run', '--hide-scrollbars'] });
}

/** Renderiza un HTML y lo guarda como PNG o JPEG del tamaño indicado. */
export async function capturarHtml(navegador, html, ruta, { ancho, alto, escala = 1, tipo = 'png', calidad = 88, transparente = false }) {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: ancho, height: alto, deviceScaleFactor: escala });
  await pagina.setContent(html, { waitUntil: 'load' });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.screenshot({
    path: ruta,
    type: tipo,
    ...(tipo === 'jpeg' ? { quality: calidad } : {}),
    omitBackground: transparente,
    clip: { x: 0, y: 0, width: ancho, height: alto },
  });
  await pagina.close();
}
