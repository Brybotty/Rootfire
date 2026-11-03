import { ChangeDetectionStrategy, Component, afterNextRender, signal } from '@angular/core';
import { CLIENTE } from '../config/cliente';

const CLAVE = `${CLIENTE.id}:cookies-v1`;

/** ¿Ya cerró el aviso en este navegador? */
function visto(): boolean {
  try {
    return !!JSON.parse(localStorage.getItem(CLAVE) ?? 'null')?.fecha;
  } catch {
    return false;
  }
}

/**
 * Aviso de cookies (uno solo, en la raíz), informativo: la página no usa publicidad ni medición, y lo único de otra
 * empresa es el mapa de Google, que se muestra siempre (decisión del negocio, 2026-10-22, como en El Acicale).
 * Sale hasta que el visitante toca "Entendido". Si algún día se agrega algo que deba pedir permiso (Meta Pixel,
 * Analytics, publicaciones de Instagram), este aviso tiene que volver a ofrecer elegir, como el de El Acicale.
 */
@Component({
  selector: 'app-aviso-cookies',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'no-imprimir' },
  template: `
    @if (visible()) {
      <section class="aviso-cookies pointer-events-none fixed inset-x-0 bottom-0 z-[70] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-5"
               role="dialog" aria-labelledby="cookies-titulo" aria-describedby="cookies-texto">
        <div class="aviso-entrada pointer-events-auto mx-auto max-w-2xl rounded-[1.6rem] border border-papel-100/15 bg-fondo-900/95 p-5 shadow-[0_20px_60px_-15px_rgb(0_0_0/0.9)] backdrop-blur-xl sm:p-6 lg:mr-0 lg:max-w-[27rem]">
          <h2 id="cookies-titulo" class="font-display text-2xl font-extrabold uppercase leading-none text-papel-50">Cookies y contenido de terceros</h2>
          <p id="cookies-texto" class="mt-2.5 text-sm leading-relaxed text-papel-300">
            Usamos solo lo necesario para que la página funcione: tu pedido, tu sesión si entras al Club y una copia de la
            carta. No hay publicidad ni seguimiento. El <strong class="text-papel-100">mapa de cómo llegar</strong> es de Google y
            guarda sus propias cookies.
          </p>
          <div class="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
            <button type="button" class="boton-fuego sm:order-last sm:ml-auto lg:order-first lg:ml-0" (click)="entendido()">Entendido</button>
            <a href="/politica-de-datos#cookies" class="enlace-toque justify-center text-sm font-bold text-papel-300 underline underline-offset-4 hover:text-papel-50">Ver la política de cookies</a>
          </div>
        </div>
      </section>
    }
  `,
})
export class AvisoCookiesComponent {
  readonly visible = signal(false);

  constructor() {
    // Sale un momento después de pintar la página, no junto con ella: así lo primero que se ve es el inicio, y Google no
    // toma el texto del aviso como "lo más grande de la carga" (LCP), que lo retrasaba (Lighthouse, 2026-11-03).
    if (!visto()) afterNextRender(() => setTimeout(() => this.visible.set(true), 1200));
  }

  entendido() {
    this.visible.set(false);
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ fecha: new Date().toISOString() }));
    } catch {
      // Navegación privada o almacenamiento bloqueado: el aviso vuelve a salir en la próxima visita.
    }
  }
}
