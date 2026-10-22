import { type Firestore, connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore/lite';
import { app } from './app';
import { EMULADORES } from './config';

export { usuarioActual } from './app';

let base: Firestore | undefined;

/**
 * Firestore "lite" (sin tiempo real ni caché): lo poco que el menú lee y escribe con sesión del Club pesa mucho menos
 * que el SDK completo.
 */
export function dbLigera(): Firestore {
  if (!base) {
    base = initializeFirestore(app(), { ignoreUndefinedProperties: true });
    if (EMULADORES) connectFirestoreEmulator(base, '127.0.0.1', 8080);
  }
  return base;
}
