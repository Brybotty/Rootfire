import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, afterNextRender, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { IconoComponent } from '../compartido/icono.component';
import { RedSocialComponent } from '../compartido/red-social.component';
import { StickerComponent } from '../compartido/sticker.component';
import type { Promocion } from '../config/modelo';
import { formatoPrecio } from '../menu/precio';
import { NegocioService } from '../negocio/negocio.service';
import { PromoService } from '../negocio/promo.service';

/** `?promo` en la dirección abre la ventana de una vez (enlace para compartir la promo). */
const PARAMETRO = 'promo';
/** Deja terminar la entrada del inicio antes de mostrar la ventana. */
const ESPERA = 1600;
/** Si el afiche tarda más que esto en bajar, la ventana ya no sale sola: quien entró ya está leyendo el menú. */
const LIMITE_CARGA = 6000;
/**
 * Ancho que se le declara al navegador para elegir el archivo. En celular se dice menos de lo que mide para
 * que baje el de 720 px (≈ 2x, nítido) y no el de 1080: son 100 KB menos con datos móviles.
 */
const TAMANOS = '(min-width: 768px) 400px, 240px';

/**
 * Promo del mes: ventana con el afiche. En celular, el afiche y los botones; en pantallas anchas, el afiche a la
 * izquierda y la promo en texto a la derecha. Sale sola una vez al día (cuando el afiche ya cargó) y se puede
 * volver a abrir desde el inicio. Los datos de la promo siempre están en texto para lectores de pantalla.
 */
@Component({
  selector: 'app-promo',
  imports: [IconoComponent, RedSocialComponent, StickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'no-imprimir' },
  template: `
    <dialog #dialogo class="promo" aria-labelledby="promo-titulo" aria-describedby="promo-nota"
            (cancel)="$event.preventDefault(); promos.cerrar()" (click)="alTocar($event)">
      @if (promo(); as p) {
        <div class="promo-panel" [style.--proporcion]="p.afiche.alto / p.afiche.ancho">
          <button type="button" class="boton-icono absolute right-3 top-3 z-10 !bg-fondo-950/70 backdrop-blur" aria-label="Cerrar la promo" (click)="promos.cerrar()">
            <app-icono nombre="cerrar" [grosor]="2.2" class="h-5 w-5" />
          </button>

          <div class="promo-marco">
            <img class="promo-afiche" [src]="p.afiche.src" [attr.srcset]="srcset(p)" [attr.sizes]="tamanos"
                 [width]="p.afiche.ancho" [height]="p.afiche.alto" [alt]="p.afiche.alt" decoding="async" />

            <div class="promo-texto">
              <p class="etiqueta self-start bg-destello-400 px-3 py-1.5 text-xs text-sobre-destello">
                <app-icono nombre="destello" [relleno]="true" [grosor]="0" class="h-3.5 w-3.5" />
                {{ p.etiqueta }}
              </p>
              @if (p.antetitulo) {
                <p class="mt-6 text-lg font-semibold italic leading-snug text-papel-200">{{ p.antetitulo }}</p>
              }
              <div class="relative mt-1">
                <!-- Recibe el foco al abrir (tabindex -1): el lector de pantalla empieza por la promo y no se resalta "Cerrar". -->
                <h2 id="promo-titulo" tabindex="-1" class="font-display text-5xl font-extrabold uppercase leading-[0.88] text-papel-50 [text-wrap:balance] focus:outline-none">
                  {{ p.titulo }}
                  @if (precio(p); as valor) {
                    <span class="mt-3 flex items-baseline gap-2.5">
                      <span class="font-sans text-base font-bold normal-case text-papel-300">por</span>&ngsp;
                      <span class="cifras text-[3.25rem] leading-none text-destello-400">{{ valor }}</span>
                    </span>
                  }
                </h2>
                <app-sticker nombre="mascota-celebra" [giro]="8" class="absolute -bottom-2 -right-1 h-16" />
              </div>
              <div id="promo-nota" class="mt-5 text-sm leading-relaxed">
                @if (p.detalle) {
                  <p class="font-semibold text-papel-50">{{ p.detalle }}</p>
                }
                @if (p.nota) {
                  <p class="text-papel-300">{{ p.nota }}</p>
                }
              </div>
            </div>

            <div class="promo-acciones">
              <!-- En celular las condiciones del afiche quedan diminutas: van también aquí (el lector ya las tiene arriba). -->
              @if (p.detalle || p.nota) {
                <p class="promo-nota" aria-hidden="true"><strong>{{ p.detalle }}</strong> {{ p.nota }}</p>
              }
              @if (whatsapp(p); as enlace) {
                <a class="boton-fuego !px-4" [href]="enlace" target="_blank" rel="noopener">
                  <app-red-social red="whatsapp" class="h-5 w-5" />
                  Pedir por WhatsApp
                </a>
                <a class="boton-linea !px-4" href="#menu" (click)="promos.cerrar()">Ver el menú</a>
              } @else {
                <a class="boton-fuego !px-4" href="#menu" (click)="promos.cerrar()">Ver el menú</a>
              }
            </div>
          </div>

          <!-- En celular el texto de arriba no se ve (lo lee el lector de pantalla): el rótulo va prendido del afiche. -->
          <p class="promo-rotulo etiqueta bg-destello-400 px-3 py-1.5 text-xs text-sobre-destello" aria-hidden="true">
            <app-icono nombre="destello" [relleno]="true" [grosor]="0" class="h-3.5 w-3.5" />
            {{ p.etiqueta }}
          </p>
        </div>
      }
    </dialog>
  `,
})
export class PromoComponent {
  protected readonly promos = inject(PromoService);
  private readonly negocio = inject(NegocioService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly dialogo = viewChild<ElementRef<HTMLDialogElement>>('dialogo');

  /** Promo que se muestra: solo existe con la ventana abierta (así el afiche no se descarga si no hace falta). */
  readonly promo = signal<Promocion | null>(null);
  readonly tamanos = TAMANOS;

  constructor() {
    effect(() => {
      const abierta = this.promos.abierta();
      untracked(() => (abierta ? this.mostrar() : this.ocultar()));
    });

    const destruir = inject(DestroyRef);
    afterNextRender(() => {
      const promo = this.promos.promo();
      const consulta = new URLSearchParams(location.search);
      // Enlace directo (?promo), para historias y estados: abre la ventana aunque ya haya salido hoy. Con la promo
      // vencida el enlace abre la página normal. El parámetro se quita para que recargar no la reabra.
      const pedida = consulta.has(PARAMETRO);
      if (pedida) {
        consulta.delete(PARAMETRO);
        const resto = consulta.toString();
        history.replaceState(history.state, '', `${location.pathname}${resto ? `?${resto}` : ''}${location.hash}`);
      }
      // Sola no sale si ya salió hoy, ni cuando la página abrió con un plato compartido (?plato=…).
      if (!promo || consulta.has('plato') || (!pedida && this.promos.vistaHoy())) return;
      let cancelada = false;
      const espera = setTimeout(
        async () => {
          const cargo = await this.precargar(promo);
          // Tampoco interrumpe si ya hay otra ventana abierta (el detalle de un plato) o la pestaña no se ve.
          if (!cargo || cancelada || document.visibilityState !== 'visible' || document.querySelector('dialog[open]')) return;
          this.promos.abrir();
        },
        pedida ? 0 : ESPERA,
      );
      destruir.onDestroy(() => {
        cancelada = true;
        clearTimeout(espera);
      });
    });
  }

  srcset(p: Promocion): string | null {
    const a = p.afiche;
    return a.pequena ? `${a.pequena.src} ${a.pequena.ancho}w, ${a.src} ${a.ancho}w` : null;
  }

  precio(p: Promocion): string {
    return p.precio ? formatoPrecio(p.precio) : '';
  }

  whatsapp(p: Promocion): string | null {
    return this.negocio.whatsappCon(p.mensajeWhatsApp ?? `Hola, Rootfire. Quiero la promo: ${p.titulo}.`);
  }

  /** Tocar fuera del panel (el fondo) cierra. */
  alTocar(evento: MouseEvent) {
    if (evento.target === this.dialogo()?.nativeElement) this.promos.cerrar();
  }

  /** Baja el afiche antes de abrir la ventana, para que nunca aparezca vacía. Sin conexión o si tarda, no abre. */
  private precargar(promo: Promocion): Promise<boolean> {
    const imagen = new Image();
    const srcset = this.srcset(promo);
    if (srcset) {
      imagen.sizes = TAMANOS;
      imagen.srcset = srcset;
    }
    imagen.src = promo.afiche.src;
    const limite = new Promise<boolean>((listo) => setTimeout(() => listo(false), LIMITE_CARGA));
    return Promise.race([imagen.decode().then(() => true, () => false), limite]);
  }

  private mostrar() {
    const d = this.dialogo()?.nativeElement;
    const promo = this.promos.promo();
    if (!d || !promo) return;
    this.promo.set(promo);
    d.classList.remove('cerrando');
    // Pinta el contenido antes de abrir y lleva el foco al título de la promo.
    this.cd.detectChanges();
    if (!d.open) d.showModal();
    d.querySelector<HTMLElement>('#promo-titulo')?.focus({ preventScroll: true });
  }

  private ocultar() {
    const d = this.dialogo()?.nativeElement;
    if (!d?.open) return;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    d.classList.add('cerrando');
    setTimeout(
      () => {
        if (this.promos.abierta()) return;
        // close() devuelve el foco a lo que lo tenía antes de abrir (el botón del inicio, si se abrió desde ahí).
        d.close();
        d.classList.remove('cerrando');
        this.promo.set(null);
      },
      reducido ? 0 : 180,
    );
  }
}
