import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { LogotipoComponent } from '../marca/logotipo.component';
import { MascotaComponent } from '../marca/mascota.component';
import { EstadoNegocioComponent } from './estado-negocio.component';

@Component({
  selector: 'app-barra-superior',
  imports: [MascotaComponent, LogotipoComponent, EstadoNegocioComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'no-imprimir' },
  template: `
    <a href="#menu" class="fixed left-3 top-3 z-[60] -translate-y-20 rounded-full bg-destello-400 px-4 py-2.5 text-sm font-bold text-sobre-destello transition focus:translate-y-0">
      Saltar al menú
    </a>
    <header class="fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300"
            [class]="conFondo() ? 'border-b border-papel-100/10 bg-fondo-950/85 backdrop-blur-xl' : 'border-b border-transparent'">
      <div class="mx-auto flex h-barra max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <a href="#inicio" class="group flex min-h-11 items-center gap-2.5" aria-label="Rootfire Burgers, ir al inicio">
          <app-mascota class="h-10 w-9 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
          <app-logotipo forma="linea" [conBurgers]="false" class="h-7 text-destello-400 sm:h-8" etiqueta="" />
        </a>

        <nav class="hidden items-center gap-1 md:flex" aria-label="Secciones">
          @for (enlace of enlaces; track enlace.href) {
            <a [href]="enlace.href" class="rounded-full px-4 py-2.5 text-sm font-semibold text-papel-200 transition hover:bg-white/5 hover:text-papel-50">
              {{ enlace.texto }}
            </a>
          }
        </nav>

        <div class="flex min-w-0 items-center gap-3">
          <app-estado-negocio class="min-w-0" [detallado]="false" />
          <a href="#menu" class="boton-fuego hidden !min-h-11 !px-5 !py-2 !text-sm lg:inline-flex">Ver el menú</a>
        </div>
      </div>
    </header>
  `,
})
export class BarraSuperiorComponent {
  readonly conFondo = signal(false);
  readonly enlaces = [
    { href: '#menu', texto: 'Menú' },
    { href: '#la-casa', texto: 'La casa' },
    { href: '#visitanos', texto: 'Visítanos' },
  ];

  constructor() {
    let cuadro = 0;
    const revisar = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        const valor = window.scrollY > 24;
        if (valor !== this.conFondo()) this.conFondo.set(valor);
      });
    };
    window.addEventListener('scroll', revisar, { passive: true });
    revisar();
    inject(DestroyRef).onDestroy(() => window.removeEventListener('scroll', revisar));
  }
}
