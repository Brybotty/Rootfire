// Promo del mes: pasa el afiche original (recursos/promos/<id>.png o .jpg) a WebP en dos tamaños, para la
// ventana que se abre al entrar a la página:
//   public/promos/<id>.webp       hasta 1080 px de ancho (pantallas de alta densidad)
//   public/promos/<id>-720.webp   la que baja casi cualquier celular
// El <id> es el de `promocion` en la config del cliente. Borra de public/promos los afiches de promos anteriores
// (los originales quedan en recursos/promos). Uso: npm run promo   (convierte con el Chrome instalado)
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { abrirChrome } from './lib/chrome.mjs';
import { cargarConfig } from './lib/config.mjs';

const { CLIENTE } = await cargarConfig();
const promo = CLIENTE.promocion;
const raiz = (ruta) => resolve(import.meta.dirname, '..', ruta);
if (!promo) {
  console.log('La config del cliente no tiene `promocion`: no hay afiche que preparar.');
  process.exit(0);
}

const TIPOS = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const extension = Object.keys(TIPOS).find((ext) => existsSync(raiz(`recursos/promos/${promo.id}.${ext}`)));
if (!extension) throw new Error(`No encontré recursos/promos/${promo.id}.png (ni .jpg): guarda ahí el afiche con ese nombre.`);
const original = raiz(`recursos/promos/${promo.id}.${extension}`);

const ANCHOS = [1080, 720];
const CALIDAD = 0.74;
const navegador = await abrirChrome();
const pagina = await navegador.newPage();
const copias = await pagina.evaluate(
  async (src, anchos, calidad) => {
    const imagen = new Image();
    imagen.src = src;
    await imagen.decode();
    const medidas = [...new Set(anchos.map((a) => Math.min(a, imagen.naturalWidth)))];
    return medidas.map((ancho) => {
      const alto = Math.round((imagen.naturalHeight * ancho) / imagen.naturalWidth);
      const lienzo = Object.assign(document.createElement('canvas'), { width: ancho, height: alto });
      const contexto = lienzo.getContext('2d');
      contexto.imageSmoothingQuality = 'high';
      contexto.drawImage(imagen, 0, 0, ancho, alto);
      return { ancho, alto, datos: lienzo.toDataURL('image/webp', calidad).split(',')[1] };
    });
  },
  `data:${TIPOS[extension]};base64,${readFileSync(original).toString('base64')}`,
  ANCHOS,
  CALIDAD,
);
await navegador.close();

const carpeta = raiz('public/promos');
mkdirSync(carpeta, { recursive: true });
for (const viejo of readdirSync(carpeta)) rmSync(resolve(carpeta, viejo));

const [grande, pequena] = copias;
const archivos = copias.map((copia, i) => {
  const nombre = `${promo.id}${i === 0 ? '' : `-${copia.ancho}`}.webp`;
  writeFileSync(resolve(carpeta, nombre), Buffer.from(copia.datos, 'base64'));
  return `promos/${nombre} (${copia.ancho} x ${copia.alto}, ${Math.round(statSync(resolve(carpeta, nombre)).size / 1024)} KB)`;
});
console.log(`Afiche de "${promo.etiqueta}" listo: ${archivos.join(' y ')}. El original pesa ${Math.round(statSync(original).size / 1024)} KB.`);

// La config debe decir las mismas medidas (así la ventana reserva el espacio antes de que cargue la imagen).
const esperado = {
  src: `promos/${promo.id}.webp`,
  ancho: grande.ancho,
  alto: grande.alto,
  ...(pequena ? { pequena: { src: `promos/${promo.id}-${pequena.ancho}.webp`, ancho: pequena.ancho } } : {}),
};
const a = promo.afiche;
const igual = a.src === esperado.src && a.ancho === esperado.ancho && a.alto === esperado.alto && a.pequena?.src === esperado.pequena?.src && a.pequena?.ancho === esperado.pequena?.ancho;
if (!igual) console.log(`OJO: en la config, promocion.afiche debe quedar así (más su "alt"):\n${JSON.stringify(esperado, null, 2)}`);
