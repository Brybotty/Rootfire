import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, browserLocalPersistence, connectAuthEmulator, indexedDBLocalPersistence, initializeAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { CONFIG_FIREBASE, EMULADORES, marcarSesion } from './config';

/**
 * La app de Firebase y las cuentas. Pesa: solo se importa desde la cuenta y el panel (que se descargan aparte) o con
 * import() desde el menú, cuando alguien con sesión del Club pide algo. Quien solo mira el menú nunca lo descarga
 * (la carta se lee con firebase/rest.ts). La base de datos está en sdk.ts (completa) y sdk-ligero.ts (lite).
 */

let instancia: FirebaseApp | undefined;
let autenticacion: Auth | undefined;

export function app(): FirebaseApp {
  return (instancia ??= getApps()[0] ?? initializeApp(CONFIG_FIREBASE));
}

/**
 * Sin la ventana de Google preparada al arrancar (se le pasa a signInWithPopup cuando alguien va a entrar): así no
 * baja un marco oculto de Google cada vez que alguien con sesión abre el menú.
 */
export function auth(): Auth {
  if (!autenticacion) {
    autenticacion = initializeAuth(app(), { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
    if (EMULADORES) connectAuthEmulator(autenticacion, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return autenticacion;
}

/** La cuenta con sesión cuando Firebase termina de revisarla (null: nadie). Deja la marca de sesión al día. */
export function usuarioActual(): Promise<User | null> {
  return new Promise((listo) => {
    const dejar = onAuthStateChanged(auth(), (usuario) => {
      dejar();
      marcarSesion(!!usuario);
      listo(usuario);
    });
  });
}
