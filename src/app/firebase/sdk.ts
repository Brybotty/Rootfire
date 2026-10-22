import { type Firestore, connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { type FirebaseStorage, connectStorageEmulator, getStorage } from 'firebase/storage';
import { app } from './app';
import { EMULADORES } from './config';

/** El SDK completo (base de datos en tiempo real y archivos), para la cuenta y el panel. */
export { app, auth, usuarioActual } from './app';

let base: Firestore | undefined;
let archivos: FirebaseStorage | undefined;

/** Los campos opcionales que quedan sin valor (undefined) simplemente no se guardan. */
export function db(): Firestore {
  if (!base) {
    base = initializeFirestore(app(), { ignoreUndefinedProperties: true });
    if (EMULADORES) connectFirestoreEmulator(base, '127.0.0.1', 8080);
  }
  return base;
}

export function storage(): FirebaseStorage {
  if (!archivos) {
    archivos = getStorage(app());
    if (EMULADORES) connectStorageEmulator(archivos, '127.0.0.1', 9199);
  }
  return archivos;
}
