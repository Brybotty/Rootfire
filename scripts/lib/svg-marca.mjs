// Piezas SVG de la marca oficial de Rootfire para los scripts (íconos, imagen para redes, QR).
// Los trazos del logotipo salen de src/app/marca/oficial.ts y los stickers de public/stickers
// (ambos los genera scripts/assets/extraer.py desde los archivos de la diseñadora).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MASCOTA } from '../../src/app/marca/mascota.ts';
import { LOGO_APILADO, LOGO_LINEA } from '../../src/app/marca/oficial.ts';

const RAIZ = resolve(import.meta.dirname, '../..');

/** Paleta oficial más el carbón de la página. */
export const COLORES = {
  carbon: '#0E0907',
  tinta: '#2A140C',
  amarillo: '#FFCB00',
  naranja: '#FF6006',
  rojo: '#D11813',
  rojoOscuro: '#8A100D',
  verde: '#8CBD00',
  verdeOscuro: '#005225',
  crema: '#FAE6CB',
};

/**
 * La cabecita de la mascota (el ícono de la página) como grupo SVG, en su caja de 100 x 112.
 * Aquí sí lleva degradados: son archivos sueltos, sin el problema de <base href> que tiene la app.
 */
export function grupoMascota({ id = 'm', borde = null } = {}) {
  const C = COLORES;
  return `
    <defs>
      <linearGradient id="${id}-llama" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${C.rojo}"/><stop offset=".55" stop-color="${C.naranja}"/><stop offset="1" stop-color="${C.naranja}"/>
      </linearGradient>
      <radialGradient id="${id}-centro" cx=".5" cy=".72" r=".6">
        <stop offset="0" stop-color="#FFE48A"/><stop offset=".6" stop-color="${C.amarillo}"/><stop offset="1" stop-color="#FFB400"/>
      </radialGradient>
    </defs>
    ${borde ? `<path d="${MASCOTA.contorno}" fill="none" stroke="${borde}" stroke-width="9" stroke-linejoin="round"/>` : ''}
    <path d="${MASCOTA.contorno}" fill="url(#${id}-llama)" stroke="${C.tinta}" stroke-width="3" stroke-linejoin="round"/>
    <path d="${MASCOTA.interior}" fill="url(#${id}-centro)"/>
    <g fill="${C.tinta}">${MASCOTA.ojos.map((d) => `<path d="${d}"/>`).join('')}</g>
    <g fill="#fff">${MASCOTA.brillos.map((d) => `<path d="${d}"/>`).join('')}</g>
    <path d="${MASCOTA.cejas}" fill="none" stroke="${C.tinta}" stroke-width="3.6" stroke-linecap="round"/>
    <path d="${MASCOTA.sonrisa}" fill="none" stroke="${C.tinta}" stroke-width="3.6" stroke-linecap="round"/>`;
}

export { MASCOTA };

/** Contenido y tamaño de un sticker (public/stickers/<nombre>.svg). */
export function sticker(nombre) {
  const texto = readFileSync(resolve(RAIZ, 'public/stickers', `${nombre}.svg`), 'utf8');
  const [, ancho, alto] = texto.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
  return { texto, ancho, alto, cuerpo: texto.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') };
}

/** Un sticker colocado dentro de otro SVG: ocupa `ancho` y queda centrado en (cx, cy). */
export function stickerEn(nombre, cx, cy, ancho) {
  const s = sticker(nombre);
  const alto = (ancho * s.alto) / s.ancho;
  return `<svg x="${cx - ancho / 2}" y="${cy - alto / 2}" width="${ancho}" height="${alto}" viewBox="0 0 ${s.ancho} ${s.alto}">${s.cuerpo}</svg>`;
}

/** Logotipo oficial como SVG suelto. */
export function logotipo(forma = 'apilado', { color = COLORES.amarillo, colorBurgers = color, conBurgers = true } = {}) {
  const l = forma === 'apilado' ? LOGO_APILADO : LOGO_LINEA;
  const alto = conBurgers ? l.alto : l.altoNombre;
  const texto = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${l.ancho} ${alto}"><path fill="${color}" d="${l.nombre}"/>${
    conBurgers ? `<path fill="${colorBurgers}" d="${l.burgers}"/>` : ''
  }</svg>`;
  return { texto, ancho: l.ancho, alto };
}

/** Documento SVG completo. */
export function svg(ancho, alto, contenido, { titulo = 'Rootfire Burgers' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}" role="img" aria-label="${titulo}"><title>${titulo}</title>${contenido}</svg>`;
}

/** Archivo de /public como data: URI (para armar HTML que Chrome convierte en imagen). */
export function datos(ruta, tipo) {
  return `data:${tipo};base64,${readFileSync(resolve(RAIZ, 'public', ruta)).toString('base64')}`;
}

export const enSvg = (texto) => `data:image/svg+xml;base64,${Buffer.from(texto).toString('base64')}`;
