import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IconoComponent } from '../../compartido/icono.component';
import { LuzDirective } from '../../compartido/luz.directive';
import { DetalleService } from '../../menu/detalle.service';
import { PlatoImagenComponent } from '../../menu/ilustracion/plato-imagen.component';
import type { IconoCategoria, Plato } from '../../menu/menu.model';
import { formatoPrecio } from '../../menu/precio';
import { EtiquetasPlatoComponent } from './etiquetas-plato.component';

/** Texto del botón para lectores de pantalla: "Ver detalle de Doble queso (plato de ejemplo), agotado, $ 32.000". */
export function etiquetaBoton(plato: Plato, precio: string): string {
  return [`Ver detalle de ${plato.nombre}${plato.ejemplo ? ' (plato de ejemplo)' : ''}`, plato.estado === 'agotado' ? 'agotado' : '', precio]
    .filter(Boolean)
    .join(', ');
}

/** Plato en la carta: fila con la ilustración a la derecha en celular, tarjeta vertical desde 640 px. */
@Component({
  selector: 'app-plato-tarjeta',
  imports: [PlatoImagenComponent, EtiquetasPlatoComponent, IconoComponent, LuzDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <article appLuz class="tarjeta borde-luz group relative flex h-full gap-4 overflow-hidden p-3.5 transition duration-300 has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-destello-400 sm:flex-col sm:gap-0 sm:p-0 sm:hover:-translate-y-1"
             [class.bg-fondo-900/40]="agotado()">
      <app-plato-imagen [plato]="plato()" [icono]="icono()" [zoomMovil]="true"
        class="order-2 h-[7.5rem] w-[7.5rem] shrink-0 self-center rounded-2xl bg-fondo-800/60 transition-transform duration-500 sm:order-none sm:aspect-[16/10] sm:h-auto sm:w-full sm:rounded-none sm:group-hover:scale-[1.03]" />
      <div class="flex min-w-0 flex-1 flex-col sm:p-5 sm:pt-4">
        <app-etiquetas-plato [plato]="plato()" modo="estado" class="mb-2 empty:hidden" />
        <h4 class="font-display text-[1.45rem] font-bold uppercase leading-[0.95] text-papel-50 sm:text-[1.6rem]">
          <button type="button" class="text-left after:absolute after:inset-0 after:z-[2] after:content-[''] focus-visible:outline-none"
                  aria-haspopup="dialog" [attr.aria-label]="etiqueta()"
                  (click)="detalle.abrir(plato(), $any($event.currentTarget))">
            {{ plato().nombre }}
          </button>
        </h4>
        <p class="mt-1.5 line-clamp-2 text-sm leading-snug text-papel-300 sm:line-clamp-3">{{ plato().descripcion }}</p>
        <div class="mt-auto flex items-center gap-2 pt-3">
          <p class="cifras mr-1 font-display text-2xl font-bold leading-none text-destello-400" [class.line-through]="agotado()" [class.opacity-60]="agotado()">
            {{ precio() }}
            @if (combo()) {
              <span class="block pt-1 font-sans text-xs font-semibold text-papel-300">En combo {{ combo() }}</span>
            }
          </p>
          <app-etiquetas-plato [plato]="plato()" modo="dieta" class="empty:hidden" />
          <span class="ml-auto hidden items-center gap-1 text-xs font-bold uppercase tracking-wider text-papel-300 transition group-hover:text-destello-300 sm:inline-flex" aria-hidden="true">
            Ver detalle
            <app-icono nombre="flecha" [grosor]="2.2" class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  `,
})
export class PlatoTarjetaComponent {
  protected readonly detalle = inject(DetalleService);
  plato = input.required<Plato>();
  icono = input<IconoCategoria>('hamburguesa');
  readonly precio = computed(() => formatoPrecio(this.plato().precio));
  readonly agotado = computed(() => this.plato().estado === 'agotado');
  readonly combo = computed(() => (this.plato().precioCombo ? formatoPrecio(this.plato().precioCombo!) : ''));
  readonly etiqueta = computed(() => etiquetaBoton(this.plato(), this.precio()));
}
