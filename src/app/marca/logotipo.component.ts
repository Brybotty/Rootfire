import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LOGO_APILADO, LOGO_LINEA } from './oficial';

/**
 * Logotipo oficial de Rootfire (el de su diseñadora), en una línea o apilado. Toma el color del texto;
 * "burgers" puede ir en otro color. Basta con darle ancho o alto: guarda su proporción.
 */
@Component({
  selector: 'app-logotipo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block', '[style.aspect-ratio]': 'proporcion()' },
  template: `
    <svg class="block h-full w-full" [attr.viewBox]="'0 0 ' + logo().ancho + ' ' + alto()" fill="currentColor"
         [attr.role]="etiqueta() ? 'img' : null" [attr.aria-label]="etiqueta() || null" [attr.aria-hidden]="etiqueta() ? null : 'true'">
      <path [attr.d]="logo().nombre" />
      @if (conBurgers()) {
        <path [attr.d]="logo().burgers" [style.fill]="colorBurgers()" />
      }
    </svg>
  `,
})
export class LogotipoComponent {
  forma = input<'apilado' | 'linea'>('apilado');
  /** Con la palabra "burgers" debajo. */
  conBurgers = input(true);
  /** Color de "burgers" (CSS). */
  colorBurgers = input('currentColor');
  /** Texto para lectores de pantalla. Vacío = decorativo. */
  etiqueta = input('Rootfire Burgers');

  readonly logo = computed(() => (this.forma() === 'apilado' ? LOGO_APILADO : LOGO_LINEA));
  readonly alto = computed(() => (this.conBurgers() ? this.logo().alto : this.logo().altoNombre));
  readonly proporcion = computed(() => `${this.logo().ancho} / ${this.alto()}`);
}
