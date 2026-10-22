import { CONFIG_FIREBASE, EMULADORES } from './config';

/**
 * Lectura de documentos públicos de Firestore con su API REST: un `fetch`, sin cargar el SDK de Firebase.
 * Es lo que usa la carta (cada visita) y el cupón que alguien escribe en su pedido: así quien solo mira el menú
 * no descarga Firebase. Las cuentas y el panel sí usan el SDK (firebase/app.ts y sdk.ts).
 */

/** Un valor tal como lo devuelve la API REST (https://firebase.google.com/docs/firestore/reference/rest/v1/Value). */
export interface ValorFirestore {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  stringValue?: string;
  referenceValue?: string;
  arrayValue?: { values?: ValorFirestore[] };
  mapValue?: { fields?: Record<string, ValorFirestore> };
}

/** Pasa un valor de la API REST a un objeto normal (las fechas quedan como texto ISO). */
export function decodificar(valor: ValorFirestore): unknown {
  if ('stringValue' in valor) return valor.stringValue;
  if ('integerValue' in valor) return Number(valor.integerValue);
  if ('doubleValue' in valor) return Number(valor.doubleValue);
  if ('booleanValue' in valor) return valor.booleanValue;
  if ('timestampValue' in valor) return valor.timestampValue;
  if ('referenceValue' in valor) return valor.referenceValue;
  if ('arrayValue' in valor) return (valor.arrayValue?.values ?? []).map(decodificar);
  if ('mapValue' in valor) return decodificarCampos(valor.mapValue?.fields);
  return null;
}

export function decodificarCampos(campos: Record<string, ValorFirestore> = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(campos).map(([clave, v]) => [clave, decodificar(v)]));
}

/**
 * Lee un documento ('publico/carta'). Devuelve sus campos, o null si no existe. Lanza un error si no hay conexión
 * o Firestore responde otra cosa (quien llama decide qué mostrar mientras tanto).
 */
export async function leerDocumento(ruta: string): Promise<Record<string, unknown> | null> {
  const { projectId, apiKey } = CONFIG_FIREBASE;
  const segmentos = ruta.split('/').map(encodeURIComponent).join('/');
  const servidor = EMULADORES ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com';
  const url = `${servidor}/v1/projects/${projectId}/databases/(default)/documents/${segmentos}${apiKey ? `?key=${apiKey}` : ''}`;
  const respuesta = await fetch(url, { cache: 'no-store' });
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error(`Firestore respondió ${respuesta.status} al leer ${ruta}`);
  const documento = (await respuesta.json()) as { fields?: Record<string, ValorFirestore> };
  return decodificarCampos(documento.fields);
}
