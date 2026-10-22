import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IconoComponent } from '../../compartido/icono.component';
import { StickerComponent } from '../../compartido/sticker.component';
import { RotuloComponent } from '../../marca/rotulo.component';
import { DetalleService } from '../../menu/detalle.service';
import { PlatoImagenComponent } from '../../menu/ilustracion/plato-imagen.component';
import type { Plato } from '../../menu/menu.model';
import { MenuService } from '../../menu/menu.service';
import { formatoPrecio } from '../../menu/precio';
import { PedidoService } from '../../pedido/pedido.service';
import { EtiquetasPlatoComponent } from './etiquetas-plato.component';
import { etiquetaBoton } from './plato-tarjeta.component';
import { PreciosPlatoComponent } from './precios-plato.component';

/**
 * Destacados. Con un solo plato: banner grande ("La estrella de la casa").
 * Con varios: carrusel con el dedo en celular y cuadrícula en escritorio (con 5, el primero ocupa 2 x 2).
 */
@Component({
  selector: 'app-destacados',
  imports: [PlatoImagenComponent, EtiquetasPlatoComponent, IconoComponent, PreciosPlatoComponent, StickerComponent, RotuloComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="mb-5 flex items-end justify-between gap-4">
      <h3 class="flex items-center gap-2.5 font-display text-3xl font-extrabold uppercase leading-none text-papel-50 sm:text-4xl">
        <app-icono nombre="llama" [relleno]="true" [grosor]="0" class="h-7 w-7 text-primario-500" />
        {{ uno() ? 'La estrella de la casa' : 'Destacados' }}
      </h3>
      @if (!uno()) {
        <p class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-papel-300 lg:hidden" aria-hidden="true">
          Desliza <app-icono nombre="flecha" [grosor]="2.2" class="h-4 w-4 animate-[desliza_1.8s_ease-in-out_infinite] motion-reduce:animate-none" />
        </p>
      }
    </div>

    @if (uno(); as plato) {
      <article class="group relative grid items-center overflow-hidden rounded-[2rem] bg-[var(--tono-fondo)] shadow-[0_40px_80px_-40px_rgb(var(--primario-600)/0.8)] transition duration-300 has-[button:focus-visible]:ring-4 has-[button:focus-visible]:ring-destello-300 sm:grid-cols-2"
               [class]="'tono-' + (plato.tono ?? 'naranja')">
        <div class="grano pointer-events-none absolute inset-0 !opacity-[0.14]" aria-hidden="true"></div>
        <span class="pointer-events-none absolute -right-6 -top-8 select-none font-display text-[9rem] font-extrabold uppercase leading-none text-transparent opacity-30 [-webkit-text-stroke:2px_var(--tono-titulo)] sm:text-[13rem]" aria-hidden="true">01</span>
        <div class="relative px-6 pt-8 sm:order-2 sm:px-8 sm:py-8">
          <app-plato-imagen [plato]="plato" [sinFondo]="true" [marcarEjemplo]="false" tamanos="(min-width: 640px) 32rem, 85vw"
            class="aspect-[5/4] w-full !overflow-visible drop-shadow-[0_24px_22px_rgb(0_0_0/0.4)] transition-transform duration-500 group-hover:scale-[1.04]" />
          <app-sticker nombre="corona" [giro]="-10" class="absolute left-[8%] top-[4%] w-[17%]" />
          <app-sticker nombre="destellos" [giro]="6" class="absolute right-[6%] top-[38%] w-[11%]" />
        </div>
        <div class="relative px-6 pb-8 sm:py-10 sm:pl-10 lg:pl-14">
          @if (plato.frase) {
            <p class="text-xs font-extrabold uppercase tracking-[0.24em] text-[color:var(--tono-acento)]">{{ plato.frase }}</p>
          }
          <h4 class="mt-4 font-display text-[3.4rem] font-extrabold uppercase leading-[0.86] text-[color:var(--tono-titulo)] sm:text-6xl lg:text-7xl">
            <button type="button" class="block w-full text-left uppercase after:absolute after:inset-0 after:z-[2] after:content-[''] focus-visible:outline-none"
                    aria-haspopup="dialog" [attr.aria-label]="etiqueta(plato)" (click)="detalle.abrir(plato, $any($event.currentTarget))">
              <app-rotulo [clave]="plato.id" [texto]="plato.nombre" class="w-full max-w-[20rem] sm:max-w-[26rem]" />
            </button>
          </h4>
          <p class="mt-4 max-w-md text-[15px] leading-relaxed text-[color:var(--tono-texto)] sm:text-base">{{ plato.descripcion }}</p>
          <app-etiquetas-plato [plato]="plato" class="mt-3 empty:hidden" />
          <app-precios-plato [plato]="plato" [grande]="true" colorEtiqueta="var(--tono-acento)" class="mt-6" />
          @if (pedido.activo && plato.estado !== 'agotado') {
            <span class="mt-5 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-black/80 pl-3 pr-4 text-sm font-bold text-white transition group-hover:bg-black" aria-hidden="true">
              <app-icono nombre="mas" [grosor]="2.6" class="h-4 w-4 text-destello-400" />
              Agregar al pedido
            </span>
          }
        </div>
      </article>
    } @else {
      <ul class="scrollbar-oculta -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:overflow-visible lg:px-0"
          [class]="columnas()">
        @for (plato of menu.destacados(); track plato.id; let i = $index) {
          <li class="w-[78%] max-w-[19rem] shrink-0 snap-start xs:w-[70%] sm:w-[44%] lg:w-auto lg:max-w-none" [class]="grande(i) ? 'lg:col-span-2 lg:row-span-2' : ''">
            <article class="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-primario-600 via-primario-800 to-fondo-900 shadow-[0_30px_60px_-30px_rgb(var(--primario-600)/0.7)] transition duration-300 has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-destello-400 hover:-translate-y-1">
              <span class="pointer-events-none absolute right-4 top-2 font-display text-6xl font-extrabold leading-none texto-contorno [-webkit-text-stroke:1.5px_rgb(var(--papel-50)/0.35)]" aria-hidden="true">
                {{ (i + 1).toString().padStart(2, '0') }}
              </span>
              <app-plato-imagen [plato]="plato" [icono]="icono(plato)" [prioridad]="i < 2"
                class="aspect-[5/4] w-full transition-transform duration-500 group-hover:scale-105" [class]="grande(i) ? 'lg:aspect-auto lg:min-h-0 lg:flex-1' : ''" />
              <div class="flex flex-col p-5 pt-1" [class]="grande(i) ? 'lg:p-8 lg:pt-2' : 'flex-1'">
                <app-etiquetas-plato [plato]="plato" modo="estado" class="mb-2 empty:hidden" />
                <h4 class="font-display text-[1.7rem] font-extrabold uppercase leading-[0.92] text-papel-50" [class]="grande(i) ? 'lg:text-5xl' : ''">
                  <button type="button" class="text-left after:absolute after:inset-0 after:z-[2] after:content-[''] focus-visible:outline-none"
                          aria-haspopup="dialog" [attr.aria-label]="etiqueta(plato)"
                          (click)="detalle.abrir(plato, $any($event.currentTarget))">
                    <app-rotulo [clave]="plato.id" [texto]="plato.nombre" class="[--alto:2.5rem]" [class]="grande(i) ? 'lg:[--alto:4rem]' : ''" />
                  </button>
                </h4>
                <p class="mt-1.5 line-clamp-2 text-sm text-papel-200">{{ plato.descripcion }}</p>
                <div class="mt-auto flex items-center gap-2 pt-4">
                  <p class="cifras mr-1 font-display text-[1.75rem] font-extrabold leading-none text-destello-400" [class]="grande(i) ? 'lg:text-4xl' : ''">{{ precio(plato) }}</p>
                  <app-etiquetas-plato [plato]="plato" modo="dieta" class="empty:hidden" />
                </div>
              </div>
            </article>
          </li>
        }
      </ul>
    }
  `,
})
export class DestacadosComponent {
  protected readonly menu = inject(MenuService);
  protected readonly detalle = inject(DetalleService);
  protected readonly pedido = inject(PedidoService);

  /** Un solo destacado: banner grande. */
  readonly uno = computed(() => (this.menu.destacados().length === 1 ? this.menu.destacados()[0] : null));
  /** Con 5 destacados, el primero ocupa 2 x 2 en escritorio (sin huecos en la cuadrícula de 4). */
  readonly bento = computed(() => this.menu.destacados().length === 5);
  readonly columnas = computed(() => {
    const total = this.menu.destacados().length;
    return this.bento() || total >= 4 ? 'lg:grid-cols-4' : total === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2';
  });

  grande(i: number) {
    return this.bento() && i === 0;
  }

  precio(plato: Plato) {
    return formatoPrecio(plato.precio);
  }

  etiqueta(plato: Plato) {
    return etiquetaBoton(plato, this.precio(plato));
  }

  icono(plato: Plato) {
    return this.menu.categoria(plato.categoriaId)?.icono ?? 'hamburguesa';
  }
}
