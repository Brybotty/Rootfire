import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { STICKERS, type NombreSticker } from '../marca/stickers';

/**
 * Sticker oficial de Rootfire (public/stickers/<nombre>.svg, de su diseñadora). Es decorativo.
 * Basta con darle ancho o alto: guarda su proporción y no mueve la página al cargar.
 * Uso: <app-sticker nombre="corona" [giro]="-10" class="absolute right-4 top-0 w-14" />
 */
@Component({
  selector: 'app-sticker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none block select-none', 'aria-hidden': 'true', '[style.aspect-ratio]': 'proporcion()' },
  template: `
    <img class="block h-full w-full drop-shadow-[0_8px_10px_rgb(0_0_0/0.45)]" [src]="'stickers/' + nombre() + '.svg'" alt=""
         [width]="tamano()[0]" [height]="tamano()[1]" [attr.loading]="prioridad() ? 'eager' : 'lazy'" decoding="async"
         [style.transform]="giro() ? 'rotate(' + giro() + 'deg)' : null" />
  `,
})
export class StickerComponent {
  nombre = input.required<NombreSticker>();
  /** Inclinación en grados. */
  giro = input(0);
  /** Carga inmediata (stickers que se ven al abrir la página). */
  prioridad = input(false);

  readonly tamano = computed(() => STICKERS[this.nombre()]);
  readonly proporcion = computed(() => `${this.tamano()[0]} / ${this.tamano()[1]}`);
}
