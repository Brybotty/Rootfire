import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconoComponent, type NombreIcono } from '../compartido/icono.component';
import { MarquesinaComponent } from '../compartido/marquesina.component';
import { RevelarDirective } from '../compartido/revelar.directive';
import { StickerComponent } from '../compartido/sticker.component';
import { LogotipoComponent } from '../marca/logotipo.component';
import { NegocioService } from '../negocio/negocio.service';

const ICONOS_DATOS: NombreIcono[] = ['calendario', 'pin', 'llama', 'raiz'];

/** "La casa": la frase de la marca, lo que se sabe del negocio, la bolsa con el sello oficial y la cinta de palabras. */
@Component({
  selector: 'app-casa',
  imports: [IconoComponent, MarquesinaComponent, RevelarDirective, StickerComponent, LogotipoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section id="la-casa" class="relative overflow-hidden pb-6 pt-16 sm:pt-24" aria-labelledby="titulo-casa">
      <div class="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-primario-600/20 blur-3xl" aria-hidden="true"></div>
      <div class="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-16 lg:px-8">
        <div class="lg:col-span-7">
          <div appRevelar>
            <p class="rotulo" data-num="02">La casa</p>
            <h2 id="titulo-casa" class="sr-only">Sobre {{ c.nombre }}</h2>
            <blockquote class="mt-6">
              <p class="font-display text-[2.5rem] font-extrabold uppercase leading-[0.92] text-papel-50 xs:text-5xl sm:text-6xl lg:text-[4.4rem]">
                «{{ cita.antes }}<span class="texto-fuego">{{ cita.despues }}</span>»
              </p>
              <footer class="mt-5 flex items-center gap-3 text-sm font-semibold text-papel-300">
                <span class="h-px w-8 bg-secundario-400"></span>
                {{ c.nombre }}
              </footer>
            </blockquote>
          </div>

          @for (parrafo of c.nosotros.historia; track $index) {
            <p appRevelar class="mt-5 max-w-2xl text-[17px] leading-relaxed text-papel-200">{{ parrafo }}</p>
          }

          <ul class="mt-10 grid gap-3 sm:grid-cols-3">
            @for (dato of c.nosotros.datos; track dato.titulo; let i = $index) {
              <li appRevelar [retraso]="i * 90" class="tarjeta flex items-center gap-4 p-5 sm:block">
                @if (dato.sticker; as sticker) {
                  <app-sticker [nombre]="sticker" [giro]="i % 2 ? 5 : -5" class="h-20 shrink-0 sm:h-24" />
                } @else {
                  <app-icono [nombre]="iconoDato(i)" class="h-7 w-7 text-secundario-400" [relleno]="iconoDato(i) === 'llama'" [grosor]="iconoDato(i) === 'llama' ? 0 : 1.75" />
                }
                <div>
                  <h3 class="font-display text-[1.6rem] font-extrabold uppercase leading-none text-papel-50 sm:mt-4">{{ dato.titulo }}</h3>
                  <p class="mt-2 text-sm leading-relaxed text-papel-300">{{ dato.texto }}</p>
                </div>
              </li>
            }
          </ul>
        </div>

        <!-- Bolsa de papel kraft con el logotipo repetido (como la de Rootfire), la mascota y el sello oficial -->
        <figure appRevelar [retraso]="120" class="relative mx-auto w-full max-w-[22rem] lg:col-span-5">
          <app-sticker nombre="corazon-derretido" [giro]="-12" class="absolute -left-2 -top-5 z-10 w-12 sm:w-14" />
          <app-sticker nombre="salsa" [giro]="8" class="absolute -right-3 top-[18%] z-10 w-16 sm:-right-8 sm:w-20" />
          <div class="papel-kraft relative aspect-[4/5] rotate-2 overflow-hidden rounded-[2rem] shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)] transition duration-500 hover:rotate-0">
            <div class="absolute inset-x-0 top-0 h-6 bg-[repeating-linear-gradient(90deg,transparent_0_10px,rgb(0_0_0/0.08)_10px_12px)]" aria-hidden="true"></div>
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 pb-12 pt-8 text-primario-500 mix-blend-multiply" aria-hidden="true">
              @for (fila of filas; track $index) {
                <app-logotipo forma="linea" [conBurgers]="false" etiqueta="" class="w-[53%]" [class.opacity-30]="$index === 1 || $index === 2" />
              }
            </div>
            <app-sticker nombre="mascota-gafas" [giro]="-5" class="absolute left-1/2 top-[47%] h-[46%] -translate-x-1/2 -translate-y-1/2" />
            <p class="absolute bottom-4 left-0 right-0 text-center text-[11px] font-extrabold uppercase tracking-[0.3em] text-fondo-900/80">{{ c.lema }}</p>
          </div>
          <!-- Sello oficial: el anillo gira, el parrillero se queda quieto -->
          <div class="absolute -bottom-8 -left-3 grid h-28 w-28 place-items-center rounded-full border border-destello-400/30 bg-fondo-950 shadow-xl sm:-left-10 sm:h-32 sm:w-32" aria-hidden="true">
            <img src="marca/sello-anillo.svg" alt="" width="900" height="900" loading="lazy" decoding="async" class="absolute inset-0 h-full w-full animate-girar motion-reduce:animate-none" />
            <img src="marca/sello-centro.svg" alt="" width="900" height="900" loading="lazy" decoding="async" class="absolute inset-0 h-full w-full" />
          </div>
          <figcaption class="sr-only">Ilustración de la bolsa de {{ c.nombre }} con su mascota y su sello</figcaption>
        </figure>
      </div>

      <div class="relative mt-24 -mx-[5%] w-[110%] -rotate-2 bg-primario-500 py-4 shadow-[0_20px_50px_-20px_rgb(var(--primario-600)/0.8)] sm:py-5">
        <app-marquesina [items]="c.nosotros.marquesina" claseTexto="text-3xl sm:text-4xl text-white" [duracion]="40" />
      </div>
    </section>
  `,
})
export class CasaComponent {
  protected readonly c = inject(NegocioService).cliente;
  readonly filas = [0, 1, 2, 3];
  /** La frase se resalta desde la última coma ("…, pero el fuego sigue siendo el mismo."). */
  readonly cita = (() => {
    const texto = this.c.nosotros.cita;
    const i = texto.lastIndexOf(',');
    return i > 0 ? { antes: texto.slice(0, i + 1), despues: texto.slice(i + 1) } : { antes: '', despues: texto };
  })();

  iconoDato(i: number): NombreIcono {
    return ICONOS_DATOS[i % ICONOS_DATOS.length];
  }
}
