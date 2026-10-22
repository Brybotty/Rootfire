import { CLIENTE } from '../config/cliente';
import type { ConfigFirebase } from '../config/modelo';
import { ENTORNO } from './entorno';

/** Emuladores de Firebase en este computador (`npm run demo`): datos de prueba, nunca los reales. */
export const EMULADORES = ENTORNO.emuladores;

/** La configuración con la que arranca Firebase: la del cliente, o un proyecto "demo-" con los emuladores. */
export const CONFIG_FIREBASE: ConfigFirebase = EMULADORES
  ? { projectId: `demo-${CLIENTE.id}`, apiKey: 'demo', appId: 'demo', authDomain: 'localhost', storageBucket: `demo-${CLIENTE.id}.appspot.com` }
  : CLIENTE.firebase;

/**
 * ¿Está la configuración web de Firebase? Sin ella la página funciona como siempre (menú de config/menu.ts, sin
 * cuentas ni panel); con ella se encienden la carta editable, el Club y el panel.
 */
export const firebaseListo = !!(CONFIG_FIREBASE.apiKey && CONFIG_FIREBASE.appId);

const CLAVE_SESION = `${CLIENTE.id}:sesion`;

/**
 * Marca en el navegador que hay una sesión del Club: el menú solo descarga Firebase si la ve (para aplicar el
 * descuento y guardar el pedido). No guarda nada de la persona.
 */
export function marcarSesion(activa: boolean) {
  try {
    if (activa) localStorage.setItem(CLAVE_SESION, '1');
    else localStorage.removeItem(CLAVE_SESION);
  } catch {
    // Navegación privada: el menú no reconocerá la sesión, pero la cuenta sigue funcionando.
  }
}

export function haySesion(): boolean {
  try {
    return firebaseListo && localStorage.getItem(CLAVE_SESION) === '1';
  } catch {
    return false;
  }
}
