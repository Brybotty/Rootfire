import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ROTULOS } from './nombres';

/** ¿Hay rótulo para esa clave? */
export const hayRotulo = (clave: string) => clave in ROTULOS;

/**
 * Rótulo: un nombre dibujado con la letra de la carta (de la diseñadora de Rootfire), pintado con el color del
 * texto. `clave` es el id del plato o de la categoría (o 'cierre'). Si no hay rótulo para esa clave, escribe el
 * texto. El texto siempre queda en la página para lectores de pantalla y buscadores.
 *
 * Guarda su proporción. Se le da el alto de la letra con la variable --alto (todos los nombres de un renglón
 * quedan con la letra del mismo tamaño) o, sin ella, un ancho (w-full, max-w-…) y el alto sale solo.
 * Las tildes sobresalen por arriba de esa caja, así los nombres de dos tarjetas vecinas quedan a la misma altura.
 * Uso: <app-rotulo [clave]="plato.id" [texto]="plato.nombre" class="[--alto:3.5rem] sm:[--alto:4rem]" />
 *
 * El ancho se calcula con calc() a partir de --alto y no con aspect-ratio: dentro de un <button> (que se ajusta a
 * su contenido), Safari 16.4 a 17 calcula mal el ancho de una caja con aspect-ratio y el nombre desaparece o se
 * sale de la tarjeta.
 */
@Component({
  selector: 'app-rotulo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // .rotulo-dibujo (styles.css) da el tamaño a partir de --alto y --proporcion, y el tope de ancho del 100 %.
  host: { '[class]': "rotulo() ? 'rotulo-dibujo' : ''", '[style.--proporcion]': 'proporcion()' },
  template: `
    @if (rotulo(); as r) {
      <span class="sr-only">{{ texto() }}</span>
      <svg [attr.viewBox]="caja()" fill="currentColor" aria-hidden="true" focusable="false">
        <path [attr.d]="r.trazo" />
      </svg>
    } @else {
      {{ texto() }}
    }
  `,
})
export class RotuloComponent {
  clave = input.required<string>();
  texto = input.required<string>();

  readonly rotulo = computed(() => ROTULOS[this.clave()] ?? null);
  readonly caja = computed(() => {
    const r = this.rotulo();
    return r ? `0 ${r.arriba} ${r.ancho} ${r.alto}` : null;
  });
  readonly proporcion = computed(() => {
    const r = this.rotulo();
    return r ? (r.ancho / r.alto).toFixed(4) : null;
  });
}
