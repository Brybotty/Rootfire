import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NegocioService } from '../negocio/negocio.service';

/** Píldora "Abierto ahora · cierra a las 11 p. m." con un punto que late. */
@Component({
  selector: 'app-estado-negocio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <p class="inline-flex min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold leading-tight"
       [class]="tono()">
      <span class="relative flex h-2.5 w-2.5 shrink-0">
        @if (n.abierto() || estado().tipo === 'hoy') {
          <span class="absolute inset-0 animate-ping rounded-full opacity-60 motion-reduce:animate-none" [class]="punto()"></span>
        }
        <span class="relative h-2.5 w-2.5 rounded-full" [class]="punto()"></span>
      </span>
      <span class="truncate">
        <span class="font-bold text-papel-50">{{ estado().titulo }}</span>
        @if (detallado() && estado().detalle) {
          <span class="text-papel-200"> · {{ estado().detalle }}</span>
        }
      </span>
    </p>
  `,
})
export class EstadoNegocioComponent {
  protected readonly n = inject(NegocioService);
  /** Con el detalle ("cierra a las…"). */
  detallado = input(true);

  readonly estado = this.n.estado;
  readonly punto = computed(() => {
    switch (this.estado().tipo) {
      case 'abierto':
      case 'hoy':
        return 'bg-fresco-400';
      case 'cierra-pronto':
        return 'bg-destello-400';
      default:
        return 'bg-primario-400';
    }
  });
  readonly tono = computed(() =>
    this.n.abierto() || this.estado().tipo === 'hoy' ? 'border-fresco-400/30 bg-fresco-900/40' : 'border-papel-100/15 bg-fondo-900/70',
  );
}
