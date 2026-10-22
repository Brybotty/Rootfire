import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IconoComponent } from '../../compartido/icono.component';
import { RotuloComponent } from '../../marca/rotulo.component';
import { DetalleService } from '../../menu/detalle.service';
import { PlatoImagenComponent } from '../../menu/ilustracion/plato-imagen.component';
import type { Plato } from '../../menu/menu.model';
import { formatoPrecio } from '../../menu/precio';
import { PromoService } from '../../negocio/promo.service';
import { PedidoService } from '../../pedido/pedido.service';
import { EtiquetasPlatoComponent } from './etiquetas-plato.component';
import { etiquetaBoton } from './plato-tarjeta.component';
import { PreciosPlatoComponent } from './precios-plato.component';

/**
 * Tarjeta de color de la carta impresa de Rootfire: un color por hamburguesa, la hamburguesa saliendo por
 * arriba, el nombre con la letra de la carta, descripción con su remate en negrilla y los precios en tiquetes.
 */
@Component({
  selector: 'app-plato-cartel',
  imports: [PlatoImagenComponent, EtiquetasPlatoComponent, PreciosPlatoComponent, RotuloComponent, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full pt-20' },
  template: `
    <article class="group relative flex h-full flex-col items-center rounded-[2rem] bg-[var(--tono-fondo)] px-5 pb-7 text-center shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)] transition duration-300 has-[button:focus-visible]:ring-4 has-[button:focus-visible]:ring-destello-300 sm:px-7 sm:hover:-translate-y-1"
             [class]="'tono-' + (plato().tono ?? 'rojo')">
      <div class="grano pointer-events-none absolute inset-0 rounded-[inherit] !opacity-[0.14]" aria-hidden="true"></div>
      <app-plato-imagen [plato]="plato()" [sinFondo]="true" [marcarEjemplo]="false"
        class="-mt-20 mb-3 aspect-[5/4] w-[86%] max-w-[20rem] !overflow-visible drop-shadow-[0_18px_16px_rgb(0_0_0/0.4)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.05]" />
      @if (promo(); as p) {
        <!-- Sello de la promo del mes sobre la tarjeta de su plato -->
        <p class="pointer-events-none absolute -left-1.5 top-5 z-[3] -rotate-6 rounded-2xl bg-destello-400 px-3 py-2 text-left leading-tight text-sobre-destello shadow-[0_10px_22px_-8px_rgb(0_0_0/0.7)]">
          <span class="block text-[11px] font-extrabold uppercase tracking-[0.12em]">{{ p.etiqueta }}</span>
          <span class="cifras block text-[13px] font-bold">{{ p.titulo }} por {{ precioPromo() }}</span>
        </p>
      }
      <app-etiquetas-plato [plato]="plato()" modo="estado" class="mb-2 justify-center empty:hidden" />
      <h4 class="mt-1 font-display text-[2.5rem] font-extrabold uppercase leading-[0.88] text-[color:var(--tono-titulo)] sm:text-[2.75rem]">
        <button type="button" class="uppercase after:absolute after:inset-0 after:z-[2] after:rounded-[2rem] after:content-[''] focus-visible:outline-none"
                aria-haspopup="dialog" [attr.aria-label]="etiqueta()" (click)="detalle.abrir(plato(), $any($event.currentTarget))">
          <app-rotulo [clave]="plato().id" [texto]="plato().nombre" class="[--alto:3.5rem] sm:[--alto:4rem]" />
        </button>
      </h4>
      <p class="mt-3 max-w-[22rem] text-[15px] leading-snug text-[color:var(--tono-texto)]">
        {{ plato().descripcion }}
        @if (plato().frase) {
          <strong class="font-extrabold italic text-[color:var(--tono-acento)]">{{ plato().frase }}</strong>
        }
      </p>
      <app-etiquetas-plato [plato]="plato()" modo="dieta" class="mt-3 justify-center empty:hidden" />
      <app-precios-plato [plato]="plato()" colorEtiqueta="var(--tono-acento)" class="mt-auto justify-center pt-5" />
      @if (pedido.activo && plato().estado !== 'agotado') {
        <!-- Toda la tarjeta abre el detalle, donde se elige y se agrega: esto solo lo anuncia a la vista. -->
        <span class="mt-5 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-black/80 pl-3 pr-4 text-sm font-bold text-white transition group-hover:bg-black" aria-hidden="true">
          <app-icono nombre="mas" [grosor]="2.6" class="h-4 w-4 text-destello-400" />
          Agregar al pedido
        </span>
      }
    </article>
  `,
})
export class PlatoCartelComponent {
  protected readonly detalle = inject(DetalleService);
  protected readonly pedido = inject(PedidoService);
  private readonly promos = inject(PromoService);
  plato = input.required<Plato>();
  /** La promo del mes, si es de este plato. */
  readonly promo = computed(() => (this.promos.promo()?.platoId === this.plato().id ? this.promos.promo() : null));
  readonly precioPromo = computed(() => formatoPrecio(this.promo()?.precio ?? 0));
  readonly etiqueta = computed(() => etiquetaBoton(this.plato(), formatoPrecio(this.plato().precio)));
}
