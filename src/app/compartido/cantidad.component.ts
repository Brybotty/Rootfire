import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconoComponent } from './icono.component';

/**
 * Selector de cantidad: "− 2 +". Emite el cambio (+1 o −1); quien lo usa decide qué hacer al llegar al mínimo.
 * Uso: <app-cantidad [valor]="2" de="Ron & Bacon" (cambio)="sumar($event)" />
 */
@Component({
  selector: 'app-cantidad',
  imports: [IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0 items-center rounded-full border border-papel-100/20 bg-fondo-950/50' },
  template: `
    <button type="button" class="grid h-11 w-11 place-items-center rounded-full text-papel-100 transition hover:text-destello-300 active:scale-90 disabled:opacity-35"
            [attr.aria-label]="'Quitar uno de ' + de()" [disabled]="valor() <= minimo()" (click)="cambio.emit(-1)">
      <app-icono nombre="menos" [grosor]="2.4" class="h-4 w-4" />
    </button>
    <span class="cifras min-w-6 text-center text-[15px] font-extrabold text-papel-50" aria-live="polite">
      <span class="sr-only">Cantidad: </span>{{ valor() }}
    </span>
    <button type="button" class="grid h-11 w-11 place-items-center rounded-full text-papel-100 transition hover:text-destello-300 active:scale-90 disabled:opacity-35"
            [attr.aria-label]="'Agregar uno de ' + de()" [disabled]="valor() >= maximo()" (click)="cambio.emit(1)">
      <app-icono nombre="mas" [grosor]="2.4" class="h-4 w-4" />
    </button>
  `,
})
export class CantidadComponent {
  valor = input.required<number>();
  /** Nombre de lo que se cuenta, para los lectores de pantalla. */
  de = input.required<string>();
  minimo = input(0);
  maximo = input(20);
  cambio = output<number>();
}
