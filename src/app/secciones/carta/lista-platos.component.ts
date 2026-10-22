import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IconoComponent } from '../../compartido/icono.component';
import { StickerComponent } from '../../compartido/sticker.component';
import { RotuloComponent, hayRotulo } from '../../marca/rotulo.component';
import type { NombreSticker } from '../../marca/stickers';
import { PlatoImagenComponent } from '../../menu/ilustracion/plato-imagen.component';
import type { Categoria, Plato } from '../../menu/menu.model';
import { formatoPrecio } from '../../menu/precio';
import { PedidoService } from '../../pedido/pedido.service';
import { EtiquetasPlatoComponent } from './etiquetas-plato.component';

/**
 * Panel con filas "nombre ··· precio" para lo que no necesita detalle (adiciones, bebidas). Si la categoría tiene
 * rótulo, va de título dentro del panel, como en la carta impresa. Con pedidos, cada fila lleva su botón "+".
 */
@Component({
  selector: 'app-lista-platos',
  imports: [PlatoImagenComponent, EtiquetasPlatoComponent, StickerComponent, RotuloComponent, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="relative rounded-[2rem] bg-[var(--tono-fondo)] px-5 py-3 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)] sm:px-8 sm:py-5"
         [class]="'tono-' + (categoria().tono ?? 'verde-oscuro')">
      <div class="grano pointer-events-none absolute inset-0 rounded-[inherit] !opacity-[0.12]" aria-hidden="true"></div>
      @if (sticker(); as nombre) {
        <app-sticker [nombre]="nombre" [giro]="8" class="absolute -right-3 -top-3 hidden h-24 opacity-95 lg:block" />
      }
      @if (conRotulo()) {
        <!-- El nombre de la categoría ya lo dice el título de la sección (oculto a la vista): este es su dibujo. -->
        <p class="relative pb-2 pt-3 text-[color:var(--tono-titulo)] sm:pt-2" aria-hidden="true">
          <app-rotulo [clave]="categoria().id" [texto]="categoria().nombre" class="[--alto:2.75rem] sm:[--alto:3rem]" />
        </p>
      }
      <ul class="relative grid gap-x-12 sm:grid-cols-2">
        @for (plato of platos(); track plato.id) {
          <li class="flex min-h-16 items-center gap-2.5 border-b border-white/10 py-2.5 last:border-b-0 xs:gap-3 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
              [class.opacity-60]="plato.estado === 'agotado'">
            <app-plato-imagen [plato]="plato" [icono]="categoria().icono" [zoomMovil]="true" [marcarEjemplo]="false"
                              class="h-12 w-12 shrink-0 rounded-full bg-black/20 max-[359px]:hidden" />
            <div class="min-w-0">
              <h4 class="font-display text-[1.35rem] font-bold uppercase leading-none text-[color:var(--tono-titulo)]">{{ plato.nombre }}</h4>
              @if (plato.descripcion) {
                <p class="mt-0.5 text-sm text-[color:var(--tono-texto)] opacity-90">{{ plato.descripcion }}</p>
              }
              <app-etiquetas-plato [plato]="plato" class="mt-1 empty:hidden" />
            </div>
            <!-- Los puntos guía solo desde 400 px: en pantallas más angostas no caben junto al botón "+". -->
            <span class="mx-1 hidden h-0 flex-1 translate-y-1.5 border-b-2 border-dotted border-[color:var(--tono-texto)] opacity-30 xs:block" aria-hidden="true"></span>
            <p class="cifras ml-auto shrink-0 text-lg font-extrabold text-[color:var(--tono-texto)]">{{ precio(plato) }}</p>
            @if (pedido.activo && plato.estado !== 'agotado') {
              <button type="button" class="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color:var(--tono-titulo)] text-[color:var(--tono-fondo)] transition hover:brightness-110 active:scale-90"
                      [attr.aria-label]="etiqueta(plato)" (click)="pedido.agregarPlato(plato, 'sola')">
                <app-icono nombre="mas" [grosor]="2.8" class="h-5 w-5" />
                @if (pedido.cantidadDe(plato.id); as n) {
                  @for (x of [n]; track x) {
                    <span class="salto cifras absolute -right-1.5 -top-1.5 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-destello-400 px-1 text-xs font-extrabold text-sobre-destello" aria-hidden="true">{{ x }}</span>
                  }
                }
              </button>
            }
          </li>
        }
      </ul>
    </div>
  `,
})
export class ListaPlatosComponent {
  categoria = input.required<Categoria>();
  protected readonly pedido = inject(PedidoService);
  platos = input.required<Plato[]>();
  readonly conRotulo = computed(() => hayRotulo(this.categoria().id));
  /** Sticker de la esquina, según el ícono de la categoría. */
  readonly sticker = computed<NombreSticker | null>(() => ({ papas: 'mascota-papas', bebida: 'bebida' } as Record<string, NombreSticker>)[this.categoria().icono] ?? null);

  precio(plato: Plato) {
    return formatoPrecio(plato.precio);
  }

  /** "Agregar Papas a la francesa al pedido (llevas 2)" */
  etiqueta(plato: Plato): string {
    const n = this.pedido.cantidadDe(plato.id);
    return `Agregar ${plato.nombre} al pedido${n ? ` (llevas ${n})` : ''}`;
  }
}
