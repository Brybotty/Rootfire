import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IconoComponent } from '../../compartido/icono.component';
import { DetalleService } from '../../menu/detalle.service';
import { PlatoImagenComponent } from '../../menu/ilustracion/plato-imagen.component';
import type { Plato } from '../../menu/menu.model';
import { formatoPrecio } from '../../menu/precio';
import { EtiquetasPlatoComponent } from './etiquetas-plato.component';
import { etiquetaBoton } from './plato-tarjeta.component';

/** Combo: ticket de papel kraft (como la bolsa de Rootfire) con sello y línea de corte. */
@Component({
  selector: 'app-combo-tarjeta',
  imports: [PlatoImagenComponent, EtiquetasPlatoComponent, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <article class="papel-kraft group relative flex h-full flex-col overflow-hidden rounded-[1.6rem] shadow-[0_24px_50px_-28px_rgb(0_0_0/0.9)] transition duration-300 has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-destello-400 hover:-translate-y-1 hover:rotate-[-0.6deg]">
      <div class="relative">
        <app-plato-imagen [plato]="plato()" icono="combo" class="aspect-[16/10] w-full" />
        <span class="absolute left-4 top-4 rotate-[-8deg] rounded-md border-[2.5px] border-primario-700 px-2 py-0.5 font-display text-lg font-extrabold uppercase leading-none tracking-wider text-primario-700 opacity-90 mix-blend-multiply">
          Combo
        </span>
      </div>

      <!-- Línea de corte con muescas -->
      <div class="relative h-0" aria-hidden="true">
        <span class="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-fondo-950"></span>
        <span class="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-fondo-950"></span>
        <span class="absolute inset-x-5 top-0 border-t-2 border-dashed border-fondo-950/30"></span>
      </div>

      <div class="flex flex-1 flex-col p-5 pt-5">
        <app-etiquetas-plato [plato]="plato()" modo="estado" [sobrePapel]="true" class="mb-2 empty:hidden" />
        <h4 class="font-display text-[1.7rem] font-extrabold uppercase leading-[0.92] text-primario-700">
          <button type="button" class="text-left after:absolute after:inset-0 after:z-[2] after:content-[''] focus-visible:outline-none"
                  aria-haspopup="dialog" [attr.aria-label]="etiqueta()"
                  (click)="detalle.abrir(plato(), $any($event.currentTarget))">
            {{ plato().nombre }}
          </button>
        </h4>
        @if (plato().incluye?.length) {
          <ul class="mt-3 space-y-1.5 text-sm font-semibold text-fondo-800">
            @for (item of plato().incluye; track item) {
              <li class="flex items-start gap-2">
                <app-icono nombre="check" [grosor]="2.6" class="mt-0.5 h-4 w-4 text-primario-700" />
                {{ item }}
              </li>
            }
          </ul>
        } @else {
          <p class="mt-2 text-sm font-medium text-fondo-800">{{ plato().descripcion }}</p>
        }
        <div class="mt-auto flex items-end justify-between gap-3 pt-5">
          <div class="flex items-center gap-2">
            <p class="cifras font-display text-[2rem] font-extrabold leading-none text-fondo-950">{{ precio() }}</p>
            <app-etiquetas-plato [plato]="plato()" modo="dieta" [sobrePapel]="true" class="empty:hidden" />
          </div>
          <span class="inline-flex items-center gap-1 rounded-full bg-fondo-950 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-destello-300 transition group-hover:bg-primario-700 group-hover:text-white" aria-hidden="true">
            Ver
            <app-icono nombre="flecha" [grosor]="2.4" class="h-4 w-4" />
          </span>
        </div>
      </div>
    </article>
  `,
})
export class ComboTarjetaComponent {
  protected readonly detalle = inject(DetalleService);
  plato = input.required<Plato>();
  readonly precio = computed(() => formatoPrecio(this.plato().precio));
  readonly etiqueta = computed(() => etiquetaBoton(this.plato(), this.precio()));
}
