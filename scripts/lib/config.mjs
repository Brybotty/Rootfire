// Carga la configuración del cliente activo y el menú directamente desde los .ts de la app.
import { register } from 'node:module';

register('./resolver-ts.mjs', import.meta.url);

export async function cargarConfig() {
  const { CLIENTE } = await import('../../src/app/config/cliente.ts');
  const { MENU } = await import('../../src/app/config/menu.ts');
  return { CLIENTE, MENU };
}
