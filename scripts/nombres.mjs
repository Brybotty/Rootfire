// Rótulos: nombres dibujados con la letra de la carta, en lugar de texto.
// Lee los SVG de recursos/nombres y escribe src/app/marca/nombres.ts con sus trazos, que la página pinta con el
// color de cada sitio. El archivo se llama como lo que nombra:
//   <id del plato>.svg o <id de la categoría>.svg (los de src/app/config/menu.ts): un renglón, letras de 79,2 de alto
//   cierre.svg: la frase de cierre del negocio, compuesta en bloque (varios renglones)
// Para un plato nuevo: guarda su SVG con el id del plato y corre: npm run nombres
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { cargarConfig } from './lib/config.mjs';

const { MENU } = await cargarConfig();
const raiz = (ruta) => resolve(import.meta.dirname, '..', ruta);
const CARPETA = raiz('recursos/nombres');
// Todas las letras miden lo mismo de alto; lo que un archivo tenga de más son las tildes, que sobresalen arriba.
const ALTO_LETRA = 79.2;
/** Rótulos en bloque: se usan con su caja completa, sin la regla del alto de letra. */
const BLOQUES = ['cierre'];

const rotulos = readdirSync(CARPETA)
  .filter((archivo) => archivo.endsWith('.svg'))
  .sort()
  .map((archivo) => {
    const svg = readFileSync(resolve(CARPETA, archivo), 'utf8');
    const caja = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const trazos = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1].replace(/\s+/g, ' ').trim());
    if (!caja || !trazos.length) throw new Error(`${archivo}: no encontré el viewBox o los trazos (¿el texto está convertido a contornos?)`);
    const [ancho, alto] = [Number(caja[1]), Number(caja[2])];
    const id = basename(archivo, '.svg');
    if (BLOQUES.includes(id)) return { id, ancho, alto, arriba: 0, trazo: trazos.join('') };
    if (alto < ALTO_LETRA - 0.5) throw new Error(`${archivo}: mide ${alto} de alto y las letras de los rótulos miden ${ALTO_LETRA}`);
    return { id, ancho, alto: ALTO_LETRA, arriba: Number((alto - ALTO_LETRA).toFixed(2)), trazo: trazos.join('') };
  });

const ids = new Set([...MENU.platos.map((p) => p.id), ...MENU.categorias.map((c) => c.id), ...BLOQUES]);
const sobran = rotulos.filter((r) => !ids.has(r.id)).map((r) => r.id);
if (sobran.length) throw new Error(`Rótulos sin plato ni categoría en el menú: ${sobran.join(', ')}. El archivo debe llamarse como su id.`);

writeFileSync(
  raiz('src/app/marca/nombres.ts'),
  `/**
 * Rótulos: nombres con la letra de la carta de Rootfire (SVG de su diseñadora o sacados de su menú, recursos/nombres).
 * Generado por scripts/nombres.mjs: no editar a mano.
 * Son trazos sin color propio: cada componente los pinta con el color del texto (currentColor).
 */

export interface Rotulo {
  ancho: number;
  /** Alto de la caja: el de las letras (${ALTO_LETRA}, igual en todos los nombres de un renglón) o el del bloque. */
  alto: number;
  /** Lo que sobresale por encima de las letras (tildes). */
  arriba: number;
  trazo: string;
}

/** Por id del plato o de la categoría; 'cierre' es la frase de cierre. */
export const ROTULOS: Record<string, Rotulo> = {
${rotulos.map((r) => `  '${r.id}': { ancho: ${r.ancho}, alto: ${r.alto}, arriba: ${r.arriba}, trazo: '${r.trazo}' },`).join('\n')}
};
`,
);

const cartel = new Set(MENU.categorias.filter((c) => c.estilo === 'cartel').map((c) => c.id));
const faltan = MENU.platos.filter((p) => cartel.has(p.categoriaId) && !rotulos.some((r) => r.id === p.id)).map((p) => p.nombre);
console.log(`Rótulos listos: ${rotulos.map((r) => r.id).join(', ')}.`);
if (faltan.length) console.log(`Sin rótulo (salen con texto): ${faltan.join(', ')}.`);
