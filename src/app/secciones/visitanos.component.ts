import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { IconoComponent } from '../compartido/icono.component';
import { RedSocialComponent } from '../compartido/red-social.component';
import { RevelarDirective } from '../compartido/revelar.directive';
import { StickerComponent } from '../compartido/sticker.component';
import { NegocioService } from '../negocio/negocio.service';
import { ConexionService } from '../pwa/conexion.service';
import { EstadoNegocioComponent } from './estado-negocio.component';

/** Solo se aceptan mapas insertados de Google Maps. */
const MAPA_VALIDO = /^https:\/\/www\.google\.com\/maps\/embed\?/;

@Component({
  selector: 'app-visitanos',
  imports: [IconoComponent, RedSocialComponent, RevelarDirective, EstadoNegocioComponent, StickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section id="visitanos" class="relative py-20 sm:py-28" aria-labelledby="titulo-visitanos">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header appRevelar class="relative">
          <app-sticker nombre="espatula" [giro]="10" class="absolute right-1 top-0 w-10 sm:w-12" />
          <p class="rotulo" data-num="03">Visítanos</p>
          <h2 id="titulo-visitanos" class="titulo-seccion mt-4">Ven con hambre</h2>
        </header>

        <div class="mt-10 grid gap-5 lg:grid-cols-12">
          <!--
            Mapa de Google (el iframe solo se carga cuando está por aparecer). El iframe es de Google y su pin no se
            puede cambiar: como Google lo pinta justo en el centro, encima va el sticker de la marca. El mapa arranca
            fijo (así no atrapa el scroll en celular); "Explorar el mapa" lo desbloquea y quita el sticker, porque al
            moverlo ya no coincidiría con el lugar.
          -->
          <div #contenedorMapa appRevelar class="tarjeta relative min-h-[20rem] overflow-hidden sm:min-h-[24rem] lg:col-span-7 lg:min-h-0">
            @if (mapa(); as src) {
              @if (cargarMapa() && conexion.enLinea()) {
                <iframe [src]="src" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen
                        class="mapa-oscuro absolute inset-0 h-full w-full border-0" [class.pointer-events-none]="!explorando()"
                        [title]="'Mapa de ' + c.nombre" [attr.tabindex]="explorando() ? null : -1" (load)="mapaListo.set(true)"></iframe>
                @if (mapaListo() && !explorando()) {
                  <div class="pointer-events-none absolute left-1/2 top-1/2" aria-hidden="true">
                    <span class="absolute -left-4 -top-2 h-4 w-8 rounded-[50%] bg-black/50 blur-[3px]"></span>
                    <span class="absolute -left-3 -top-3 h-6 w-6 animate-ping rounded-full bg-destello-400/60 motion-reduce:hidden"></span>
                    <app-sticker [nombre]="c.ubicacion.marcador ?? 'llama'" class="marcador absolute bottom-0 left-0 h-[4.5rem] -translate-x-1/2" />
                  </div>
                  <button type="button" class="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-papel-100/20 bg-fondo-950/90 px-4 text-sm font-bold text-papel-50 shadow-lg backdrop-blur transition hover:border-destello-400/70"
                          (click)="explorando.set(true)">
                    <app-icono nombre="mover" [grosor]="2" class="h-4 w-4 text-destello-400" />
                    Explorar el mapa
                  </button>
                }
              }
            }
            @if (!mapa() || !conexion.enLinea()) {
              <div class="absolute inset-0 bg-[linear-gradient(rgb(var(--papel-100)/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--papel-100)/0.05)_1px,transparent_1px)] bg-[size:28px_28px]" aria-hidden="true"></div>
              <svg class="absolute inset-0 h-full w-full text-papel-100/10" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <path d="M-10 210 C 90 180 150 230 230 190 S 360 120 420 150" fill="none" stroke="currentColor" stroke-width="18" />
                <path d="M120 -10 C 140 80 110 160 160 310" fill="none" stroke="currentColor" stroke-width="12" />
                <path d="M300 -10 L 260 310" fill="none" stroke="currentColor" stroke-width="8" />
              </svg>
              <div class="relative flex h-full min-h-[inherit] flex-col items-center justify-center gap-3 p-8 text-center">
                <app-sticker [nombre]="c.ubicacion.marcador ?? 'llama'" class="h-20" />
                <p class="font-display text-3xl font-extrabold uppercase leading-none text-papel-50">{{ direccionCorta() }}</p>
                <p class="max-w-xs text-sm text-papel-300">
                  @if (!conexion.enLinea()) {
                    Sin conexión: el mapa aparece cuando vuelva el internet.
                  } @else {
                    El mapa aparece aquí en cuanto confirmemos la dirección exacta.
                  }
                </p>
              </div>
            }
          </div>

          <div class="flex flex-col gap-5 lg:col-span-5">
            <div appRevelar [retraso]="80" class="tarjeta p-6">
              <h3 class="flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.2em] text-papel-300">
                <app-icono nombre="pin" class="h-5 w-5 text-secundario-400" /> Dónde estamos
              </h3>
              <address class="mt-3 not-italic">
                <p class="text-lg font-semibold text-papel-50">{{ direccion() }}</p>
                @if (ciudad()) {
                  <p class="text-papel-300">{{ ciudad() }}</p>
                }
              </address>
              @if (c.ubicacion.mapaUrl) {
                <a [href]="c.ubicacion.mapaUrl" target="_blank" rel="noopener" class="boton-fuego mt-5 w-full sm:w-auto">
                  Cómo llegar
                  <app-icono nombre="externo" [grosor]="2.2" class="h-4 w-4" />
                </a>
              }
            </div>

            <div appRevelar [retraso]="140" class="tarjeta p-6">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h3 class="flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.2em] text-papel-300">
                  <app-icono nombre="reloj" class="h-5 w-5 text-secundario-400" /> Horario
                </h3>
                <app-estado-negocio [detallado]="false" />
              </div>
              <dl class="mt-4 divide-y divide-papel-100/10">
                @for (fila of n.semana(); track fila.dia) {
                  <div class="flex min-h-11 items-center justify-between gap-3 py-2 text-[15px]"
                       [class]="fila.esHoy ? '-mx-3 rounded-xl border-0 bg-destello-400/10 px-3 text-papel-50' : 'text-papel-200'"
                       [attr.aria-current]="fila.esHoy ? 'date' : null">
                    <dt class="flex items-center gap-2 font-semibold">
                      {{ fila.nombre }}
                      @if (fila.esHoy) {
                        <span class="etiqueta bg-destello-400 text-sobre-destello">Hoy</span>
                      }
                      @if (fila.festivo) {
                        <span class="etiqueta border border-secundario-400/60 text-secundario-300">Festivo</span>
                      }
                    </dt>
                    <dd class="cifras text-right" [class.text-papel-400]="fila.tipo === 'cerrado'" [class.italic]="fila.tipo === 'por-confirmar'">
                      {{ fila.horas }}
                    </dd>
                  </div>
                }
              </dl>
              @if (n.horasFestivos) {
                <p class="mt-3 flex items-start gap-2.5 border-t border-papel-100/10 pt-4 text-sm leading-snug text-papel-200">
                  <app-icono nombre="calendario" class="mt-px h-[18px] w-[18px] text-secundario-400" />
                  <span>Los festivos también abrimos: <span class="cifras whitespace-nowrap font-semibold text-papel-50">{{ n.horasFestivos }}</span></span>
                </p>
              }
            </div>

            <div appRevelar [retraso]="200" class="tarjeta p-6">
              <h3 class="text-xs font-extrabold uppercase tracking-[0.2em] text-papel-300">Síguenos y escríbenos</h3>
              <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                @for (red of c.redes; track red.url) {
                  <a [href]="red.url" target="_blank" rel="noopener" class="boton-linea">
                    <app-red-social [red]="red.red" class="h-5 w-5" />
                    {{ '@' + red.usuario }}
                  </a>
                }
                @if (n.whatsapp(); as enlace) {
                  <a [href]="enlace" target="_blank" rel="noopener" class="boton-brasa" [attr.aria-label]="'Escribir por WhatsApp al ' + n.telefono()">
                    <app-red-social red="whatsapp" class="h-5 w-5" />
                    <span class="cifras">{{ n.telefono() }}</span>
                  </a>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    /* El mapa de Google en oscuro, a tono con la página (se invierte y se devuelve el tono de los colores). */
    .mapa-oscuro {
      filter: invert(0.92) hue-rotate(180deg) saturate(0.75) brightness(0.95) contrast(0.92);
    }
    /* El sticker "salta" sobre el punto exacto del local. */
    .marcador {
      transform-origin: 50% 100%;
      animation: saltar 2.4s ease-in-out infinite;
    }
    @keyframes saltar {
      0%,
      100% {
        transform: translate(-50%, 0);
      }
      50% {
        transform: translate(-50%, -9px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .marcador {
        animation: none;
      }
    }
  `,
})
export class VisitanosComponent {
  protected readonly n = inject(NegocioService);
  protected readonly conexion = inject(ConexionService);
  protected readonly c = this.n.cliente;
  private readonly sanitizer = inject(DomSanitizer);
  private readonly contenedor = viewChild.required<ElementRef<HTMLElement>>('contenedorMapa');

  readonly cargarMapa = signal(false);
  /** El iframe ya cargó (antes de eso no se pinta el marcador). */
  readonly mapaListo = signal(false);
  /** El visitante pidió mover el mapa: se desbloquea y se quita el marcador propio. */
  readonly explorando = signal(false);
  readonly mapa = computed(() => {
    const url = this.c.ubicacion.mapaEmbedUrl;
    return MAPA_VALIDO.test(url) ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });
  readonly direccion = computed(() => {
    const u = this.c.ubicacion;
    return u.direccion ? [u.direccion, u.barrio].filter(Boolean).join(', ') : `${u.referencia} · dirección exacta por confirmar`;
  });
  readonly direccionCorta = computed(() => this.c.ubicacion.direccion || this.c.ubicacion.referencia || 'Punto físico');
  readonly ciudad = computed(() => [this.c.ubicacion.ciudad, this.c.ubicacion.departamento].filter(Boolean).join(', '));

  constructor() {
    const destruir = inject(DestroyRef);
    afterNextRender(() => {
      if (!this.mapa()) return;
      if (!('IntersectionObserver' in window)) return this.cargarMapa.set(true);
      const observador = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            this.cargarMapa.set(true);
            observador.disconnect();
          }
        },
        { rootMargin: '400px 0px' },
      );
      observador.observe(this.contenedor().nativeElement);
      destruir.onDestroy(() => observador.disconnect());
    });
  }
}
