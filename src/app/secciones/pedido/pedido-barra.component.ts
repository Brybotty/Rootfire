import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IconoComponent } from '../../compartido/icono.component';
import { formatoPrecio } from '../../menu/precio';
import { PedidoService } from '../../pedido/pedido.service';

/** Barra flotante "Ver pedido · 3 · $ 83.000": aparece cuando hay algo en el pedido (encima de la barra de abajo en celular). */
@Component({
  selector: 'app-pedido-barra',
  imports: [IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'no-imprimir' },
  template: `
    @if (pedido.unidades(); as unidades) {
      <div class="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 md:inset-x-auto md:bottom-6 md:right-6">
        <button type="button" class="boton-fuego w-full !justify-between gap-5 !px-5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.85)]"
                aria-haspopup="dialog" (click)="pedido.abierto.set(true)">
          <span class="flex items-center gap-2.5">
            <app-icono nombre="bolsa" [grosor]="2" class="h-5 w-5" />
            Ver pedido
            @for (n of [unidades]; track n) {
              <span class="salto cifras grid h-6 min-w-6 place-items-center rounded-full bg-sobre-destello px-1.5 text-xs text-destello-300">{{ n }}</span>
            }
          </span>
          <span class="cifras">{{ total() }}</span>
        </button>
      </div>
    }
    <p class="sr-only" role="status" aria-live="polite">{{ anuncio() }}</p>
  `,
})
export class PedidoBarraComponent {
  protected readonly pedido = inject(PedidoService);
  readonly total = computed(() => formatoPrecio(this.pedido.total()));
  /** Para lectores de pantalla: qué se agregó y cómo va el pedido. */
  readonly anuncio = computed(() => {
    const unidades = this.pedido.unidades();
    const ultimo = this.pedido.ultimo();
    if (!ultimo || !unidades) return '';
    return `Agregado: ${ultimo}. Llevas ${unidades} ${unidades === 1 ? 'producto' : 'productos'}, ${this.total()}.`;
  });
}
