import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { IconoComponent } from '../compartido/icono.component';
import { CLIENTE } from '../config/cliente';
import { ConsentimientoService } from '../legal/consentimiento.service';
import { LogotipoComponent } from '../marca/logotipo.component';
import { MascotaComponent } from '../marca/mascota.component';

/** Marco de las páginas aparte del menú (políticas, términos y cuenta): barra con la marca y pie con lo legal. */
@Component({
  selector: 'app-pagina',
  imports: [IconoComponent, LogotipoComponent, MascotaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh flex-col' },
  template: `
    <header class="sticky top-0 z-40 border-b border-papel-100/10 bg-fondo-950/90 backdrop-blur-xl">
      <div class="mx-auto flex h-barra max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="/" class="group flex min-h-11 items-center gap-2.5" [attr.aria-label]="c.nombre + ', volver al menú'">
          <app-mascota class="h-10 w-9 transition-transform duration-300 group-hover:-rotate-6" />
          <app-logotipo forma="linea" [conBurgers]="false" class="h-7 text-destello-400 sm:h-8" etiqueta="" />
        </a>
        <a href="/#menu" class="boton-linea !min-h-11 !px-4 !py-2 !text-sm">
          <app-icono nombre="carta" class="h-4 w-4 text-destello-400" />
          Ver el menú
        </a>
      </div>
    </header>

    <main class="flex-1">
      <ng-content />
    </main>

    <footer class="border-t border-papel-100/10 bg-fondo-950 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-8">
      <nav class="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-1 px-4 text-sm sm:px-6" aria-label="Información legal">
        <a href="/politica-de-datos" class="enlace-toque text-papel-200 hover:text-destello-300" [attr.aria-current]="actual() === 'politica' ? 'page' : null">Política de datos</a>
        <a href="/terminos" class="enlace-toque text-papel-200 hover:text-destello-300" [attr.aria-current]="actual() === 'terminos' ? 'page' : null">Términos y condiciones</a>
        <a href="/cuenta" class="enlace-toque text-papel-200 hover:text-destello-300" [attr.aria-current]="actual() === 'cuenta' ? 'page' : null">Mi cuenta</a>
        <button type="button" class="enlace-toque text-papel-200 hover:text-destello-300" (click)="consentimiento.abrirPreferencias()">Preferencias de cookies</button>
        <p class="w-full pt-3 text-papel-400 sm:ml-auto sm:w-auto sm:pt-0">© {{ anio }} {{ c.nombre }}</p>
      </nav>
    </footer>
  `,
})
export class PaginaComponent {
  /** Página en la que se está (marca su enlace del pie). */
  actual = input<'politica' | 'terminos' | 'cuenta' | null>(null);
  protected readonly consentimiento = inject(ConsentimientoService);
  protected readonly c = CLIENTE;
  readonly anio = new Date().getFullYear();
}
