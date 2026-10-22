import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { IconoComponent } from '../compartido/icono.component';
import { LuzDirective } from '../compartido/luz.directive';
import { RedSocialComponent } from '../compartido/red-social.component';
import { LogotipoComponent } from '../marca/logotipo.component';
import { MascotaComponent } from '../marca/mascota.component';
import { MenuService } from '../menu/menu.service';
import { formatoPrecio } from '../menu/precio';
import { NegocioService } from '../negocio/negocio.service';
import { PromoService } from '../negocio/promo.service';
import { EstadoNegocioComponent } from './estado-negocio.component';

/** Chispas con valores fijos (pseudoaleatorios) para que no cambien en cada carga. */
const BRASAS = Array.from({ length: 18 }, (_, i) => {
  const azar = (semilla: number) => {
    const x = Math.sin(i * 12.9898 + semilla * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    x: `${(azar(1) * 100).toFixed(1)}%`,
    t: `${(2 + azar(2) * 4).toFixed(1)}px`,
    d: `${(6 + azar(3) * 7).toFixed(1)}s`,
    r: `${(-azar(4) * 12).toFixed(1)}s`,
    deriva: `${((azar(5) - 0.5) * 120).toFixed(0)}px`,
  };
});

@Component({
  selector: 'app-inicio',
  imports: [LogotipoComponent, MascotaComponent, EstadoNegocioComponent, IconoComponent, RedSocialComponent, LuzDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section id="inicio" appLuz class="relative isolate overflow-hidden pb-14 pt-[calc(var(--alto-barra)+1.25rem)] sm:pb-20 lg:flex lg:min-h-[100svh] lg:flex-col lg:justify-center lg:pb-20 lg:pt-[calc(var(--alto-barra)+2rem)]"
             [class.pausado]="pausado()" aria-labelledby="titular">
      <!-- Fondo: eco del nombre, resplandor de brasa, chispas, luz del mouse y grano -->
      <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div class="absolute -right-24 -top-6 hidden rotate-[-6deg] select-none font-display text-[13rem] font-extrabold uppercase leading-[0.82] text-transparent [-webkit-text-stroke:1.5px_rgb(var(--papel-100)/0.06)] lg:block">
          Rootfire<br />Rootfire<br />Rootfire<br />Rootfire
        </div>
        <div class="resplandor absolute -bottom-[38%] left-1/2 h-[80%] w-[150%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(var(--destello-400)/.55),rgb(var(--secundario-500)/.45)_35%,rgb(var(--primario-600)/.35)_60%,transparent)] blur-2xl lg:w-[110%]"></div>
        <div class="brasas">
          @for (b of brasas; track $index) {
            <span class="brasa" [style.--x]="b.x" [style.--t]="b.t" [style.--d]="b.d" [style.--r]="b.r" [style.--deriva]="b.deriva"></span>
          }
        </div>
        <div class="luz absolute inset-0"></div>
        <div class="grano absolute inset-0"></div>
        <div class="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-fondo-950"></div>
      </div>

      <div class="mx-auto grid w-full max-w-7xl items-center gap-y-8 px-4 sm:px-6 lg:grid-cols-12 lg:gap-x-10 lg:px-8">
        <!-- Cartel: logotipo oficial + la mascota (sigue el mouse con los ojos) dentro de su sello giratorio -->
        <div class="relative mx-auto flex w-full max-w-[24rem] items-center justify-center gap-4 sm:max-w-[30rem] sm:gap-14 lg:order-2 lg:col-span-5 lg:max-w-none lg:justify-end lg:gap-12" aria-hidden="true">
          <app-logotipo forma="apilado" etiqueta="" colorBurgers="rgb(var(--papel-100))"
            class="entrada w-[38%] shrink-0 text-destello-400 drop-shadow-[0_8px_30px_rgb(var(--primario-600)/0.55)] sm:w-[34%]" />
          <div class="relative w-[42%] shrink-0 sm:w-[38%] lg:w-[40%]">
            <svg class="absolute -inset-[16%] hidden h-[132%] w-[132%] animate-girar text-papel-100/60 motion-reduce:animate-none sm:block" viewBox="0 0 200 200">
              @for (letra of sello; track $index) {
                <text x="100" y="12" text-anchor="middle" class="fill-current font-display text-[13px] font-bold"
                      [attr.transform]="'rotate(' + letra.angulo + ' 100 100)'">{{ letra.c }}</text>
              }
            </svg>
            <app-mascota class="entrada relative block w-full rotate-6" [animada]="true" [mirar]="true" borde="rgb(var(--destello-400))"
                         [style.--retraso]="'500ms'" />
          </div>
        </div>

        <!-- Texto -->
        <div class="lg:order-1 lg:col-span-7">
          <p class="entrada mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-extrabold uppercase tracking-[0.24em] text-secundario-300 sm:tracking-[0.28em]">
            <app-icono nombre="llama" [relleno]="true" [grosor]="0" class="h-4 w-4 text-primario-400" />
            {{ inicio.antetitulo }}
          </p>
          <h1 id="titular" class="font-display text-[3.5rem] font-extrabold uppercase leading-[0.86] text-papel-50 xs:text-[4.1rem] sm:text-[5.5rem] lg:text-[7.2rem] xl:text-[8.4rem]">
            <span class="sr-only">{{ n.cliente.nombre }}: </span>
            <span class="entrada block" [style.--retraso]="'120ms'">{{ inicio.titulo }}</span>
            <span class="block">
              <span class="entrada inline-block pb-[0.06em]" [style.--retraso]="'260ms'"><span class="texto-fuego">{{ inicio.destacado }}</span></span>
            </span>
          </h1>
          <p class="entrada mt-5 max-w-xl text-[17px] leading-relaxed text-papel-200 sm:text-lg" [style.--retraso]="'420ms'">
            {{ inicio.subtitulo }}
          </p>

          <div class="entrada mt-7 flex flex-col gap-3 xs:flex-row xs:flex-wrap" [style.--retraso]="'560ms'">
            <a href="#menu" class="boton-fuego group">
              Ver el menú
              <app-icono nombre="flecha-abajo" [grosor]="2.4" class="h-5 w-5 transition-transform group-hover:translate-y-0.5" />
            </a>
            @if (n.whatsapp(); as enlace) {
              <a [href]="enlace" target="_blank" rel="noopener" class="boton-linea">
                <app-red-social red="whatsapp" class="h-5 w-5 text-destello-400" />
                Escríbenos por WhatsApp
              </a>
            } @else {
              <a href="#visitanos" class="boton-linea">
                <app-icono nombre="reloj" class="h-5 w-5 text-destello-400" />
                Horario y ubicación
              </a>
            }
          </div>

          <div class="entrada mt-7 flex flex-wrap items-center gap-3" [style.--retraso]="'680ms'">
            <app-estado-negocio class="max-w-full" />
            @if (menu.desde(); as desde) {
              <p class="inline-flex items-center gap-2 rounded-full border border-destello-400/30 bg-destello-400/10 px-3 py-1.5 text-[13px] font-semibold text-papel-100">
                <app-icono nombre="hamburguesa" class="h-4 w-4 text-destello-400" />
                {{ desde.categoria }} desde <strong class="cifras text-destello-300">{{ formato(desde.precio) }}</strong>
              </p>
            }
          </div>

          <!-- Promo del mes: vuelve a abrir la ventana del afiche (que sola sale una vez al día) -->
          @if (promos.promo(); as promo) {
            <button type="button" class="entrada group mt-3 inline-flex min-h-11 max-w-full items-center gap-3 rounded-2xl border border-destello-400/40 bg-gradient-to-r from-primario-500/25 to-destello-400/10 py-2 pl-3.5 pr-3 text-left text-sm font-semibold leading-snug text-papel-100 transition duration-300 hover:border-destello-400/80 active:scale-[0.98]"
                    [style.--retraso]="'800ms'" aria-haspopup="dialog" (click)="promos.abrir()">
              <app-icono nombre="destello" [relleno]="true" [grosor]="0" class="h-5 w-5 text-destello-400" />
              <span>
                <strong class="mr-1 text-xs font-extrabold uppercase tracking-[0.14em] text-destello-300">{{ promo.etiqueta }}</strong>
                {{ promo.titulo }}
                @if (promo.precio; as precio) {
                  por <strong class="cifras text-papel-50">{{ formato(precio) }}</strong>
                }
              </span>
              <app-icono nombre="flecha" [grosor]="2.2" class="h-4 w-4 text-destello-300 transition-transform group-hover:translate-x-0.5" />
            </button>
          }
        </div>
      </div>
    </section>
  `,
})
export class InicioComponent {
  protected readonly n = inject(NegocioService);
  protected readonly menu = inject(MenuService);
  protected readonly promos = inject(PromoService);
  readonly inicio = this.n.cliente.inicio;
  readonly formato = formatoPrecio;
  readonly brasas = BRASAS;
  /** Texto del sello que gira alrededor de la mascota: el nombre y el lema, letra por letra. */
  readonly sello = (() => {
    const texto = `${this.n.cliente.nombre} • ${this.n.cliente.lema} • `.toUpperCase();
    return [...texto].map((c, i) => ({ c, angulo: ((i * 360) / texto.length).toFixed(1) }));
  })();
  /** Animaciones en pausa cuando el inicio no se ve (ahorra batería). */
  readonly pausado = signal(false);

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    if (!('IntersectionObserver' in window)) return;
    const observador = new IntersectionObserver(([e]) => this.pausado.set(!e.isIntersecting), { threshold: 0 });
    queueMicrotask(() => observador.observe(el));
    inject(DestroyRef).onDestroy(() => observador.disconnect());
  }
}
