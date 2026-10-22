import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconoComponent } from './icono.component';

/**
 * Cinta de palabras que se desplaza sin fin (se pausa al pasar el mouse).
 * La lista va duplicada para que el bucle no salte; la copia queda oculta para lectores de pantalla.
 */
@Component({
  selector: 'app-marquesina',
  imports: [IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block overflow-hidden desvanecer-lados' },
  template: `
    <div class="flex w-max animate-desfile hover:[animation-play-state:paused]" [style.--duracion]="duracion() + 's'">
      @for (copia of [0, 1]; track copia) {
        <ul class="flex shrink-0 items-center" [attr.aria-hidden]="copia === 1 ? 'true' : null">
          @for (item of items(); track item) {
            <li class="flex items-center gap-6 whitespace-nowrap px-6 font-display font-extrabold uppercase" [class]="claseTexto()">
              {{ item }}
              <app-icono nombre="llama" [relleno]="true" [grosor]="0" class="h-5 w-5 text-secundario-500" />
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class MarquesinaComponent {
  items = input.required<string[]>();
  /** Segundos de una vuelta completa. */
  duracion = input(36);
  claseTexto = input('text-3xl sm:text-4xl text-papel-100');
}
