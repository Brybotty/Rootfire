import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconoComponent } from '../compartido/icono.component';
import { RedSocialComponent } from '../compartido/red-social.component';
import { NegocioService } from '../negocio/negocio.service';

/** Accesos rápidos fijos abajo en celular (respeta la zona segura del iPhone). */
@Component({
  selector: 'app-barra-inferior',
  imports: [IconoComponent, RedSocialComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'no-imprimir' },
  template: `
    <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-papel-100/10 bg-fondo-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Accesos rápidos">
      <ul class="mx-auto grid max-w-md grid-cols-4">
        <li>
          <a href="#menu" class="boton-barra">
            <app-icono nombre="carta" class="h-6 w-6" />
            Menú
          </a>
        </li>
        <li>
          <button type="button" class="boton-barra w-full" (click)="buscar()">
            <app-icono nombre="buscar" class="h-6 w-6" />
            Buscar
          </button>
        </li>
        <li>
          <a href="#visitanos" class="boton-barra">
            <app-icono nombre="reloj" class="h-6 w-6" />
            Horario
          </a>
        </li>
        <li>
          @if (n.whatsapp(); as enlace) {
            <a [href]="enlace" target="_blank" rel="noopener" class="boton-barra">
              <app-red-social red="whatsapp" class="h-6 w-6" />
              WhatsApp
            </a>
          } @else if (n.instagram; as ig) {
            <a [href]="ig.url" target="_blank" rel="noopener" class="boton-barra">
              <app-red-social red="instagram" class="h-6 w-6" />
              Instagram
            </a>
          }
        </li>
      </ul>
    </nav>
  `,
  styles: `
    .boton-barra {
      display: flex;
      height: 4rem;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: rgb(var(--papel-200));
      transition: color 0.2s;
    }
    .boton-barra:active {
      color: rgb(var(--destello-300));
    }
  `,
})
export class BarraInferiorComponent {
  protected readonly n = inject(NegocioService);

  buscar() {
    const campo = document.getElementById('buscador') as HTMLInputElement | null;
    if (!campo) return;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    campo.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'center' });
    campo.focus({ preventScroll: true });
  }
}
