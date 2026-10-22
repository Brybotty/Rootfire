import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ConsentimientoService } from './consentimiento.service';

/**
 * Aviso de cookies (uno solo, en la raíz). Sale hasta que el visitante elige y vuelve a abrirse desde
 * "Preferencias de cookies" en el pie de página. Rechazar es tan fácil como aceptar.
 */
@Component({
  selector: 'app-aviso-cookies',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'no-imprimir' },
  template: `
    @if (!consentimiento.decidido() || consentimiento.configurando()) {
      <section class="aviso-cookies pointer-events-none fixed inset-x-0 bottom-0 z-[70] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-5"
               role="dialog" aria-labelledby="cookies-titulo" aria-describedby="cookies-texto">
        <div class="pointer-events-auto mx-auto max-w-2xl rounded-[1.6rem] border border-papel-100/15 bg-fondo-900/95 p-5 shadow-[0_20px_60px_-15px_rgb(0_0_0/0.9)] backdrop-blur-xl sm:p-6 lg:mr-0 lg:max-w-[27rem]">
          <h2 id="cookies-titulo" class="font-display text-2xl font-extrabold uppercase leading-none text-papel-50">Cookies y contenido de terceros</h2>
          <p id="cookies-texto" class="mt-2.5 text-sm leading-relaxed text-papel-300">
            Usamos solo lo necesario para que la página funcione: tu pedido, tu sesión si entras al Club y esta elección.
            No hay publicidad ni seguimiento. Con tu permiso mostramos el <strong class="text-papel-100">mapa de Google</strong> de cómo
            llegar, que guarda sus propias cookies.
          </p>

          @if (detalle()) {
            <ul class="mt-5 divide-y divide-papel-100/10 rounded-2xl border border-papel-100/10">
              <li class="flex items-center justify-between gap-4 p-4">
                <div>
                  <p class="text-sm font-bold text-papel-50">Necesarias</p>
                  <p class="text-xs text-papel-400">Pedido, sesión, copia de la carta y esta elección.</p>
                </div>
                <span class="etiqueta bg-papel-100/10 text-papel-200">Siempre</span>
              </li>
              <li>
                <label class="flex cursor-pointer items-center justify-between gap-4 p-4">
                  <span>
                    <span class="block text-sm font-bold text-papel-50">Mapa de Google</span>
                    <span class="block text-xs text-papel-400">Cómo llegar al local. Lo sirve Google, con sus cookies.</span>
                  </span>
                  <input type="checkbox" class="peer sr-only" [checked]="mapa()" (change)="mapa.set($any($event.target).checked)" />
                  <span class="interruptor"></span>
                </label>
              </li>
            </ul>
          }

          <div class="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
            @if (detalle()) {
              <button type="button" class="boton-fuego sm:order-last sm:ml-auto lg:order-first lg:ml-0" (click)="guardar()">Guardar mi elección</button>
            } @else {
              <button type="button" class="boton-fuego sm:order-last sm:ml-auto lg:order-first lg:ml-0" (click)="consentimiento.aceptarTodo()">Aceptar todo</button>
              <button type="button" class="boton-linea sm:order-2" (click)="consentimiento.soloNecesarias()">Solo las necesarias</button>
            }
            <div class="flex justify-center gap-5 text-sm font-bold text-papel-300 sm:order-first lg:order-last">
              <button type="button" class="enlace-toque underline underline-offset-4 hover:text-papel-50" (click)="detalle.set(!detalle())">
                {{ detalle() ? 'Ocultar opciones' : 'Elegir una por una' }}
              </button>
              <a href="/politica-de-datos#cookies" class="enlace-toque underline underline-offset-4 hover:text-papel-50">Más información</a>
            </div>
          </div>
        </div>
      </section>
    }
  `,
})
export class AvisoCookiesComponent {
  protected readonly consentimiento = inject(ConsentimientoService);
  readonly detalle = signal(false);
  readonly mapa = signal(false);

  constructor() {
    // Al abrirlo desde el pie de página se muestran las opciones con lo que el visitante ya eligió.
    effect(() => {
      if (!this.consentimiento.configurando()) return;
      this.mapa.set(this.consentimiento.preferencias()?.mapa ?? false);
      this.detalle.set(true);
    });
  }

  guardar() {
    this.consentimiento.guardar({ mapa: this.mapa() });
    this.detalle.set(false);
  }
}
