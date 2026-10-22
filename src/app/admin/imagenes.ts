import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase/sdk';

/** Una imagen lista para la carta: la grande y, si hace falta, una pequeña para celular (como las de public/). */
export interface ImagenSubida {
  src: string;
  ancho: number;
  alto: number;
  pequena?: { src: string; ancho: number };
}

/** Lo más grande que se acepta de la foto original (el celular de hoy toma fotos de 5 a 10 MB). */
const MAXIMO_ORIGINAL = 25 * 1024 * 1024;

/**
 * Sube una imagen a Storage (`publico/<carpeta>/`) ya reducida: WebP (o JPEG en los navegadores que no lo saben
 * escribir) de `ancho` px y otra de `anchoPequeno` px para celular. Así una foto de 8 MB del celular queda en
 * ~100 KB y la página sigue cargando rápido. Las PNG con fondo transparente lo conservan en WebP.
 */
export async function subirImagen(archivo: File, carpeta: 'platos' | 'promos', ancho: number, anchoPequeno?: number): Promise<ImagenSubida> {
  if (!archivo.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  if (archivo.size > MAXIMO_ORIGINAL) throw new Error('La imagen pesa demasiado (más de 25 MB).');
  const imagen = await createImageBitmap(archivo);
  const nombre = `${Date.now().toString(36)}-${archivo.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'imagen'}`;
  try {
    const grande = await reducir(imagen, ancho);
    const src = await guardar(grande.blob, `publico/${carpeta}/${nombre}-${grande.ancho}`);
    const subida: ImagenSubida = { src, ancho: grande.ancho, alto: grande.alto };
    if (anchoPequeno && imagen.width > anchoPequeno * 1.2) {
      const pequena = await reducir(imagen, anchoPequeno);
      subida.pequena = { src: await guardar(pequena.blob, `publico/${carpeta}/${nombre}-${pequena.ancho}`), ancho: pequena.ancho };
    }
    return subida;
  } finally {
    imagen.close();
  }
}

async function reducir(imagen: ImageBitmap, maximo: number): Promise<{ blob: Blob; ancho: number; alto: number }> {
  const escala = Math.min(1, maximo / imagen.width);
  const ancho = Math.round(imagen.width * escala);
  const alto = Math.round(imagen.height * escala);
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('El navegador no pudo preparar la imagen.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imagen, 0, 0, ancho, alto);
  const blob = await new Promise<Blob | null>((listo) => lienzo.toBlob(listo, 'image/webp', 0.82));
  // Safari viejo no escribe WebP y devuelve PNG (pesado): mejor JPEG.
  if (blob && blob.type === 'image/webp') return { blob, ancho, alto };
  const jpeg = await new Promise<Blob | null>((listo) => lienzo.toBlob(listo, 'image/jpeg', 0.85));
  if (!jpeg) throw new Error('El navegador no pudo preparar la imagen.');
  return { blob: jpeg, ancho, alto };
}

async function guardar(blob: Blob, ruta: string): Promise<string> {
  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const destino = ref(storage(), `${ruta}.${extension}`);
  await uploadBytes(destino, blob, { contentType: blob.type, cacheControl: 'public, max-age=31536000, immutable' });
  return getDownloadURL(destino);
}
