import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { MASCOTA } from './mascota';

/**
 * La cabecita de la mascota de Rootfire. Capas de color planas en lugar de degradados SVG:
 * los degradados con url(#id) fallan en Safari y Firefox cuando la página tiene <base href> y la URL
 * lleva parámetros (por ejemplo un QR con ?mesa=3).
 *
 * - animada: la llama se mece y parpadea.
 * - mirar: con mouse, los ojos siguen el puntero.
 */
@Component({
  selector: 'app-mascota',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block' },
  template: `
    <svg class="block h-full w-full overflow-visible" viewBox="-6 -6 112 124" [attr.role]="etiqueta() ? 'img' : null"
         [attr.aria-label]="etiqueta() || null" [attr.aria-hidden]="etiqueta() ? null : 'true'">
      <g [class.animar-llama]="animada()">
        @if (borde()) {
          <path [attr.d]="m.contorno" fill="none" [style.stroke]="borde()" stroke-width="10" stroke-linejoin="round" />
        }
        <path [attr.d]="m.contorno" style="fill: rgb(var(--primario-500))" stroke="#2A140C" stroke-width="3" stroke-linejoin="round" />
        <path [attr.d]="m.contorno" transform="translate(50 74) scale(.86) translate(-50 -74)" style="fill: rgb(var(--secundario-500))" />
        <path [attr.d]="m.interior" style="fill: rgb(var(--destello-400))" />
        <path [attr.d]="m.interior" transform="translate(50 86) scale(.62) translate(-50 -86)" style="fill: rgb(var(--destello-300))" />
        <g [attr.transform]="mirada()">
          <g [class.parpadear]="animada()" fill="#1E0F09">
            @for (ojo of m.ojos; track $index) {
              <path [attr.d]="ojo" />
            }
          </g>
          <g fill="#fff">
            @for (brillo of m.brillos; track $index) {
              <path [attr.d]="brillo" />
            }
          </g>
        </g>
        <path [attr.d]="m.cejas" fill="none" stroke="#1E0F09" stroke-width="3.6" stroke-linecap="round" />
        <path [attr.d]="m.sonrisa" fill="none" stroke="#1E0F09" stroke-width="3.6" stroke-linecap="round" />
      </g>
    </svg>
  `,
})
export class MascotaComponent implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly m = MASCOTA;

  animada = input(false);
  mirar = input(false);
  /** Color del borde tipo sticker (CSS). Vacío = sin borde. */
  borde = input('');
  /** Texto para lectores de pantalla. Vacío = decorativa. */
  etiqueta = input('');

  readonly mirada = signal('translate(0 0)');
  private cuadro = 0;
  private quitar?: () => void;

  ngOnInit() {
    if (!this.mirar() || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const mover = (e: PointerEvent) => {
      cancelAnimationFrame(this.cuadro);
      this.cuadro = requestAnimationFrame(() => {
        const caja = this.el.nativeElement.getBoundingClientRect();
        const dx = e.clientX - (caja.left + caja.width / 2);
        const dy = e.clientY - (caja.top + caja.height * 0.62);
        const distancia = Math.hypot(dx, dy) || 1;
        const fuerza = Math.min(distancia / 240, 1) * 2.4;
        this.mirada.set(`translate(${((dx / distancia) * fuerza).toFixed(2)} ${((dy / distancia) * fuerza).toFixed(2)})`);
      });
    };
    window.addEventListener('pointermove', mover, { passive: true });
    this.quitar = () => window.removeEventListener('pointermove', mover);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.cuadro);
    this.quitar?.();
  }
}
