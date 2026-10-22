import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';

/**
 * Hace aparecer el elemento (sube y se aclara) cuando entra en pantalla, una sola vez.
 * Uso: <div appRevelar [retraso]="120">
 */
@Directive({
  selector: '[appRevelar]',
  host: { class: 'revelar', '[style.--retraso]': "retraso() + 'ms'" },
})
export class RevelarDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private observador?: IntersectionObserver;

  retraso = input(0);

  ngOnInit() {
    const el = this.el.nativeElement;
    if (!('IntersectionObserver' in window)) {
      el.classList.add('revelado');
      return;
    }
    this.observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          el.classList.add('revelado');
          this.observador?.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -32px 0px' },
    );
    this.observador.observe(el);
  }

  ngOnDestroy() {
    this.observador?.disconnect();
  }
}
