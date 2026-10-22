import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconoComponent } from '../compartido/icono.component';
import { PedidoService } from '../pedido/pedido.service';
import { ConexionService } from './conexion.service';

/** Avisos flotantes: sin conexión (el menú guardado sigue disponible) y versión nueva del menú. */
@Component({
  selector: 'app-avisos',
  imports: [IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'no-imprimir' },
  template: `
    <div class="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6" role="status" aria-live="polite"
         [class]="pedido.unidades() ? 'bottom-[calc(8.5rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))]'">
      @if (!conexion.enLinea()) {
        <p class="pointer-events-auto flex items-center gap-2.5 rounded-full border border-papel-100/15 bg-fondo-800/95 px-4 py-2.5 text-sm font-semibold text-papel-100 shadow-xl backdrop-blur">
          <app-icono nombre="sin-conexion" class="h-5 w-5 text-destello-400" />
          Sin conexión: estás viendo el menú guardado
        </p>
      }
      @if (conexion.versionNueva()) {
        <div class="pointer-events-auto flex items-center gap-3 rounded-full border border-destello-400/40 bg-fondo-800/95 py-1.5 pl-4 pr-1.5 text-sm font-semibold text-papel-100 shadow-xl backdrop-blur">
          Hay una versión nueva del menú
          <button type="button" class="boton-fuego !min-h-10 !px-4 !py-1.5 !text-sm" (click)="conexion.recargar()">Actualizar</button>
        </div>
      }
    </div>
  `,
})
export class AvisosComponent {
  protected readonly conexion = inject(ConexionService);
  /** Con la barra "Ver pedido" a la vista, los avisos suben para no taparla. */
  protected readonly pedido = inject(PedidoService);
}
