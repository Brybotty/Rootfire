import type { Type } from '@angular/core';

/**
 * Páginas aparte del menú, sin router: se descargan solo cuando alguien las abre, así el menú (lo que abre el QR de
 * la mesa) no carga nada de más. Los enlaces entre páginas son enlaces normales (`href="/terminos"`). Firebase
 * Hosting y el service worker responden index.html en cualquier dirección.
 * Van en dos paquetes y no en cuatro: cada paquete aparte parte el código que comparte con el menú en otro trozo,
 * y los trozos comprimen peor (con cuatro, el menú pesaba 2 KB más). Las políticas no llevan Firebase; la cuenta y
 * el panel sí.
 */
export type Pagina = 'menu' | 'politica' | 'terminos' | 'cuenta' | 'admin';

const RUTAS: Record<string, Pagina> = {
  '/politica-de-datos': 'politica',
  '/terminos': 'terminos',
  '/cuenta': 'cuenta',
  '/club': 'cuenta',
  '/admin': 'admin',
};

/** Página de una dirección ('/admin/' y '/ADMIN' también valen). Cualquier otra abre el menú, como siempre. */
export function paginaDe(ruta: string): Pagina {
  const limpia = ruta.toLowerCase().replace(/\/+$/, '') || '/';
  return RUTAS[limpia] ?? 'menu';
}

export const CARGAR: Record<Exclude<Pagina, 'menu'>, () => Promise<Type<unknown>>> = {
  politica: () => import('./paginas/legal').then((m) => m.PoliticaDatosComponent),
  terminos: () => import('./paginas/legal').then((m) => m.TerminosComponent),
  cuenta: () => import('./paginas/con-cuenta').then((m) => m.CuentaComponent),
  admin: () => import('./paginas/con-cuenta').then((m) => m.AdminComponent),
};
