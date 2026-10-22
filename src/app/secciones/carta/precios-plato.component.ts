import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Plato } from '../../menu/menu.model';
import { formatoPrecio } from '../../menu/precio';

/**
 * Precios del plato como tiquetes de papel (como la carta impresa de Rootfire): "SOLA" y "EN COMBO".
 * Sin precio en combo, un solo tiquete sin título. El estilo del tiquete (.tiquete) está en styles.css.
 */
@Component({
  selector: 'app-precios-plato',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-wrap items-end gap-3' },
  template: `
    @for (p of precios(); track p.etiqueta) {
      <div class="flex flex-col items-center gap-1 drop-shadow-[0_6px_8px_rgb(0_0_0/0.3)]">
        @if (p.etiqueta) {
          <span class="text-[11px] font-extrabold uppercase italic leading-none tracking-wide" [style.color]="colorEtiqueta()">{{ p.etiqueta }}</span>
        }
        <span class="tiquete cifras" [class.tiquete-grande]="grande()">{{ p.valor }}</span>
      </div>
    }
  `,
})
export class PreciosPlatoComponent {
  plato = input.required<Plato>();
  /** Color de "SOLA" / "EN COMBO" (CSS). */
  colorEtiqueta = input('rgb(var(--papel-200))');
  grande = input(false);

  readonly precios = computed(() => {
    const p = this.plato();
    return p.precioCombo
      ? [
          { etiqueta: 'Sola', valor: formatoPrecio(p.precio) },
          { etiqueta: 'En combo', valor: formatoPrecio(p.precioCombo) },
        ]
      : [{ etiqueta: '', valor: formatoPrecio(p.precio) }];
  });
}
