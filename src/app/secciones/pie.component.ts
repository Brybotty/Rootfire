import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CartaService } from '../carta/carta.service';
import { IconoComponent } from '../compartido/icono.component';
import { firebaseListo } from '../firebase/config';
import { RedSocialComponent } from '../compartido/red-social.component';
import { LogotipoComponent } from '../marca/logotipo.component';
import { RotuloComponent } from '../marca/rotulo.component';
import { NegocioService } from '../negocio/negocio.service';
import { StickerComponent } from '../compartido/sticker.component';
import { EstadoNegocioComponent } from './estado-negocio.component';

@Component({
  selector: 'app-pie',
  imports: [IconoComponent, RedSocialComponent, LogotipoComponent, EstadoNegocioComponent, StickerComponent, RotuloComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block no-imprimir' },
  template: `
    <footer class="relative overflow-hidden border-t border-papel-100/10 bg-fondo-950 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-16 md:pb-10">
      <div class="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[120%] -translate-x-1/2 rounded-[50%] bg-primario-600/25 blur-3xl" aria-hidden="true"></div>
      <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <app-sticker nombre="corona" [giro]="12" class="absolute right-4 top-0 w-12 sm:right-8 sm:w-14" />
        <div class="grid gap-12 md:grid-cols-12">
          <div class="md:col-span-5">
            <div class="flex items-end gap-4">
              <app-logotipo forma="apilado" colorBurgers="rgb(var(--papel-100))" class="w-24 text-destello-400 sm:w-28" />
              <app-sticker nombre="trio" [giro]="3" class="w-36 sm:w-44" />
            </div>
            <p class="mt-7 max-w-sm font-display text-4xl font-extrabold uppercase leading-[0.9] text-papel-50 sm:text-5xl">
              <app-rotulo clave="cierre" [texto]="c.cierre + '.'" class="w-full max-w-[17rem] sm:max-w-[19rem]" />
            </p>
            <app-estado-negocio class="mt-5" />
          </div>

          <nav class="md:col-span-3" aria-label="Pie de página">
            <h2 class="text-xs font-extrabold uppercase tracking-[0.2em] text-papel-300">Explora</h2>
            <ul class="mt-3">
              @for (enlace of enlaces; track enlace.href) {
                <li><a [href]="enlace.href" class="enlace-toque text-papel-100 transition hover:text-destello-300">{{ enlace.texto }}</a></li>
              }
              <li>
                <button type="button" class="enlace-toque text-papel-100 transition hover:text-destello-300" (click)="imprimir()">
                  <app-icono nombre="imprimir" class="h-4 w-4" /> Imprimir el menú
                </button>
              </li>
              @if (cuentas) {
                <li>
                  <a href="/cuenta" class="enlace-toque text-papel-100 transition hover:text-destello-300">
                    <app-icono nombre="usuario" class="h-4 w-4" /> {{ club().activo ? club().nombre : 'Mi cuenta' }}
                  </a>
                </li>
              }
            </ul>
          </nav>

          <div class="md:col-span-4">
            <h2 class="text-xs font-extrabold uppercase tracking-[0.2em] text-papel-300">Síguenos</h2>
            <ul class="mt-3">
              @for (red of c.redes; track red.url) {
                <li>
                  <a [href]="red.url" target="_blank" rel="noopener" class="enlace-toque text-papel-100 transition hover:text-destello-300">
                    <app-red-social [red]="red.red" class="h-5 w-5" />
                    {{ '@' + red.usuario }}
                  </a>
                </li>
              }
              @if (n.whatsapp(); as enlace) {
                <li>
                  <a [href]="enlace" target="_blank" rel="noopener" class="enlace-toque text-papel-100 transition hover:text-destello-300">
                    <app-red-social red="whatsapp" class="h-5 w-5" /> WhatsApp {{ n.telefono() }}
                  </a>
                </li>
              }
            </ul>
          </div>
        </div>

        <div class="mt-14 flex flex-col gap-2 border-t border-papel-100/10 pt-6 text-sm text-papel-400 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p>© {{ anio }} {{ c.nombre }}. Precios en pesos colombianos.</p>
            <nav class="mt-1 flex flex-wrap gap-x-5" aria-label="Información legal">
              <a href="/politica-de-datos" class="enlace-toque underline-offset-4 hover:text-papel-100 hover:underline">Política de datos</a>
              <a href="/terminos" class="enlace-toque underline-offset-4 hover:text-papel-100 hover:underline">Términos y condiciones</a>
              <a href="/politica-de-datos#cookies" class="enlace-toque underline-offset-4 hover:text-papel-100 hover:underline">Cookies</a>
            </nav>
          </div>
          <p>
            {{ c.firma.etiqueta }} ·
            @if (c.firma.url) {
              <a [href]="c.firma.url" target="_blank" rel="noopener" class="font-bold text-papel-200 underline-offset-4 hover:text-destello-300 hover:underline">{{ c.firma.nombre }}</a>
            } @else {
              <span class="font-bold text-papel-200">{{ c.firma.nombre }}</span>
            }
          </p>
        </div>
      </div>
    </footer>
  `,
})
export class PieComponent {
  protected readonly n = inject(NegocioService);
  protected readonly c = this.n.cliente;
  private readonly cartas = inject(CartaService);
  protected readonly club = computed(() => this.cartas.carta().club);
  /** Sin la configuración de Firebase no hay cuentas: el enlace no se muestra. */
  protected readonly cuentas = firebaseListo;
  readonly anio = new Date().getFullYear();
  readonly enlaces = [
    { href: '#menu', texto: 'Menú' },
    { href: '#la-casa', texto: 'La casa' },
    { href: '#visitanos', texto: 'Horario y ubicación' },
  ];

  imprimir() {
    window.print();
  }
}
