import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Pone la posición del mouse en --luz-x / --luz-y (px, relativas al elemento) para que el CSS dibuje
 * una luz que lo sigue (clases .luz y .borde-luz). Solo con mouse: en celulares no hace nada.
 * Uso: <section appLuz> … <div class="luz absolute inset-0"></div> … </section>
 */
@Directive({ selector: '[appLuz]' })
export class LuzDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private cuadro = 0;
  private quitar?: () => void;

  ngOnInit() {
    const el = this.el.nativeElement;
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    // La app no usa zone.js: mover el mouse no dispara detección de cambios.
    const mover = (evento: PointerEvent) => {
      cancelAnimationFrame(this.cuadro);
      this.cuadro = requestAnimationFrame(() => {
        const caja = el.getBoundingClientRect();
        el.style.setProperty('--luz-x', `${evento.clientX - caja.left}px`);
        el.style.setProperty('--luz-y', `${evento.clientY - caja.top}px`);
      });
    };
    el.addEventListener('pointermove', mover, { passive: true });
    this.quitar = () => el.removeEventListener('pointermove', mover);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.cuadro);
    this.quitar?.();
  }
}
