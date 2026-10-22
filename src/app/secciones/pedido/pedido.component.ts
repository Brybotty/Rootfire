import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, afterNextRender, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { sellosEnTarjeta } from '../../club/club';
import { ClubService } from '../../club/club.service';
import { CantidadComponent } from '../../compartido/cantidad.component';
import { firebaseListo } from '../../firebase/config';
import { IconoComponent } from '../../compartido/icono.component';
import { RedSocialComponent } from '../../compartido/red-social.component';
import { StickerComponent } from '../../compartido/sticker.component';
import { formatoPrecio } from '../../menu/precio';
import { NegocioService } from '../../negocio/negocio.service';
import { PromoService } from '../../negocio/promo.service';
import type { Entrega } from '../../pedido/pedido';
import { PedidoService } from '../../pedido/pedido.service';

/**
 * "Tu pedido": lo que se ha agregado, cómo se entrega, una nota, el cupón, el Club y el botón que lo manda por
 * WhatsApp. Hoja inferior en celular y ventana en escritorio (mismos estilos que el detalle del plato).
 * No pide datos personales: la dirección y el pago se hablan en el chat. Registrarse en el Club es opcional.
 */
@Component({
  selector: 'app-pedido',
  imports: [CantidadComponent, IconoComponent, RedSocialComponent, StickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'no-imprimir' },
  template: `
    <dialog #dialogo class="hoja pedido" aria-labelledby="pedido-titulo" (cancel)="$event.preventDefault(); cerrar()" (click)="alTocar($event)">
      @if (visible()) {
        <div class="hoja-panel relative mx-auto flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[1.75rem] border border-b-0 border-papel-100/10 bg-fondo-900 shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.8)] md:max-h-[calc(100dvh-48px)] md:rounded-[1.75rem] md:border-b">
          <header class="flex items-center justify-between gap-3 border-b border-papel-100/10 py-3 pl-5 pr-3">
            <h2 id="pedido-titulo" class="flex items-center gap-2.5 font-display text-[1.9rem] font-extrabold uppercase leading-none text-papel-50">
              <app-icono nombre="bolsa" [grosor]="2" class="h-6 w-6 text-destello-400" />
              Tu pedido
            </h2>
            <button type="button" class="boton-icono" aria-label="Cerrar el pedido" (click)="cerrar()">
              <app-icono nombre="cerrar" [grosor]="2.2" class="h-5 w-5" />
            </button>
          </header>

          @if (pedido.lineas().length) {
            <div class="overflow-y-auto overscroll-contain px-5 pb-5 pt-2">
              <ul class="divide-y divide-papel-100/10">
                @for (l of pedido.lineas(); track l.clave) {
                  <li class="flex items-center gap-3 py-3">
                    <div class="min-w-0 flex-1">
                      <p class="font-bold leading-snug text-papel-50">{{ l.nombre }}</p>
                      @if (l.detalle) {
                        <p class="text-sm leading-snug text-papel-300">{{ l.detalle }}</p>
                      }
                      <p class="cifras mt-0.5 text-sm font-bold text-destello-300">{{ precio(l.subtotal) }}</p>
                    </div>
                    <app-cantidad [valor]="l.cantidad" [de]="l.nombre" (cambio)="pedido.cambiar(l.clave, $event)" />
                  </li>
                }
              </ul>

              @if (pedido.ahorroPromo(); as ahorro) {
                @if (promos.promo(); as promo) {
                  <div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-destello-400/40 bg-destello-400/10 p-3.5 text-sm leading-snug text-papel-100">
                    <p class="min-w-0 flex-1 basis-52">
                      <strong class="text-destello-300">Ahorra {{ precio(ahorro) }} con la {{ promo.etiqueta.toLowerCase() }}:</strong>
                      {{ promo.titulo }} por {{ precio(promo.precio ?? 0) }}. {{ promo.detalle }}
                    </p>
                    <button type="button" class="boton-fuego !min-h-11 !px-4 !py-2 !text-sm" (click)="pedido.usarPromo()">Usar la promo</button>
                  </div>
                }
              }

              <h3 class="mt-5 text-xs font-extrabold uppercase tracking-[0.2em] text-papel-300">¿Cómo lo quieres?</h3>
              <div class="mt-2.5 grid grid-cols-2 gap-2" role="group" aria-label="Entrega">
                @for (e of entregas; track e.id) {
                  <button type="button" class="opcion" [attr.aria-pressed]="pedido.entrega() === e.id" (click)="pedido.entrega.set(e.id)">{{ e.texto }}</button>
                }
              </div>

              <label class="mt-5 block">
                <span class="text-xs font-extrabold uppercase tracking-[0.2em] text-papel-300">Nota <span class="font-semibold normal-case tracking-normal text-papel-400">(opcional)</span></span>
                <textarea rows="2" maxlength="200" placeholder="Sin pepinillos, salsas aparte…"
                          class="mt-2 block w-full resize-none rounded-2xl border border-papel-100/15 bg-fondo-950/50 px-4 py-3 text-[15px] text-papel-50 transition placeholder:text-papel-400 focus:border-destello-400/70 focus:outline-none focus:ring-2 focus:ring-destello-400/30"
                          [value]="pedido.nota()" (input)="pedido.nota.set($any($event.target).value)"></textarea>
              </label>

              @if (cupones) {
                <div class="mt-5">
                  @if (pedido.cupon(); as cupon) {
                    <div class="flex items-center gap-3 rounded-2xl border border-destello-400/40 bg-destello-400/10 p-3.5 text-sm leading-snug">
                      <app-icono nombre="cupon" class="h-5 w-5 text-destello-300" />
                      <p class="min-w-0 flex-1 text-papel-100">
                        <strong class="text-destello-300">{{ cupon.codigo }}</strong>
                        @if (cupon.descripcion) { · {{ cupon.descripcion }} }
                        @if (pedido.avisoCupon(); as aviso) {
                          <span class="mt-1 block text-primario-200">{{ aviso }}</span>
                        }
                      </p>
                      <button type="button" class="enlace-toque text-sm font-bold text-papel-300 underline underline-offset-4 hover:text-papel-50" (click)="pedido.quitarCupon()">Quitar</button>
                    </div>
                  } @else if (verCupon()) {
                    <form class="flex gap-2" (submit)="$event.preventDefault(); pedido.aplicarCupon(codigo.value)">
                      <label class="sr-only" for="cupon">Código del cupón</label>
                      <input #codigo id="cupon" class="campo min-w-0 flex-1 uppercase" autocomplete="off" autocapitalize="characters" maxlength="20" placeholder="Código del cupón" />
                      <button type="submit" class="boton-linea !min-h-12 shrink-0 !px-4" [disabled]="pedido.revisandoCupon()">
                        {{ pedido.revisandoCupon() ? 'Revisando…' : 'Aplicar' }}
                      </button>
                    </form>
                    @if (pedido.errorCupon(); as error) {
                      <p class="mt-2 text-sm text-primario-200" role="alert">{{ error }}</p>
                    }
                  } @else {
                    <button type="button" class="enlace-toque text-sm font-bold text-papel-200 underline underline-offset-4 hover:text-papel-50" (click)="verCupon.set(true)">
                      <app-icono nombre="cupon" class="h-4 w-4 text-destello-400" /> ¿Tienes un cupón?
                    </button>
                  }
                </div>
              }

              @if (club.activo()) {
                @if (club.cliente(); as cliente) {
                  <div class="mt-4 rounded-2xl border border-fresco-400/30 bg-fresco-500/10 p-3.5 text-sm leading-snug text-papel-100">
                    <p class="flex items-center gap-2">
                      <app-icono nombre="usuario" class="h-4 w-4 text-fresco-300" />
                      <span>Pides como <strong class="text-papel-50">{{ cliente.nombre }}</strong> · <a href="/cuenta" class="font-bold underline underline-offset-4 hover:text-destello-300">Mi cuenta</a></span>
                    </p>
                    @if (club.ajustes().sellos.activo) {
                      <p class="mt-1.5 text-papel-300">
                        Este pedido te suma un sello cuando te lo entreguemos. Llevas {{ enTarjeta() }} de {{ club.ajustes().sellos.meta }}.
                      </p>
                    }
                    @if (club.premios() > 0) {
                      <label class="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-fondo-950/40 p-3">
                        <span><strong class="text-destello-300">¡Tienes un premio!</strong> Canjéalo en este pedido: {{ club.ajustes().sellos.premio }}.</span>
                        <input type="checkbox" class="peer sr-only" [checked]="pedido.usarPremio()" (change)="pedido.usarPremio.set($any($event.target).checked)" />
                        <span class="interruptor"></span>
                      </label>
                    }
                  </div>
                } @else if (beneficio()) {
                  <a href="/cuenta?volver=pedido" class="mt-4 flex items-start gap-3 rounded-2xl border border-dashed border-papel-100/25 p-3.5 text-sm leading-snug text-papel-200 transition hover:border-destello-400/60">
                    <app-icono nombre="regalo" class="mt-px h-5 w-5 text-destello-400" />
                    <span>
                      <strong class="text-papel-50">{{ club.ajustes().nombre }}:</strong> {{ beneficio() }}. Registrarte es opcional.
                      <span class="font-bold text-papel-50 underline underline-offset-4">Entrar o registrarme</span>
                    </span>
                  </a>
                }
              }

              @if (!negocio.abierto()) {
                <p class="mt-4 flex items-start gap-2.5 rounded-2xl bg-primario-500/15 p-3.5 text-sm leading-snug text-primario-100">
                  <app-icono nombre="reloj" class="mt-px h-5 w-5 text-primario-300" />
                  <span>Ahora estamos cerrados{{ cuando() }}. Puedes enviar el pedido y te respondemos al abrir.</span>
                </p>
              }
            </div>

            <footer class="border-t border-papel-100/10 bg-fondo-900 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3.5">
              @if (pedido.descuento(); as descuento) {
                <p class="flex justify-between gap-3 text-sm text-papel-300">
                  <span>Subtotal</span>
                  <span class="cifras">{{ precio(pedido.total()) }}</span>
                </p>
                <p class="mb-1.5 flex justify-between gap-3 text-sm font-semibold text-fresco-300">
                  <span>{{ descuento.concepto }}</span>
                  <span class="cifras">−{{ precio(descuento.valor) }}</span>
                </p>
              }
              <p class="flex items-baseline justify-between gap-3">
                <span class="text-sm font-bold uppercase tracking-[0.14em] text-papel-300">Total</span>
                <strong class="cifras font-display text-4xl font-extrabold leading-none text-destello-400">{{ precio(pedido.totalAPagar()) }}</strong>
              </p>
              <p class="mt-1.5 text-[13px] leading-snug text-papel-300">{{ avisoEntrega() }}</p>
              @if (pedido.enlace(); as enlace) {
                <a class="boton-fuego mt-3 w-full !px-4" [href]="enlace" target="_blank" rel="noopener" (click)="pedido.alEnviar()">
                  <app-red-social red="whatsapp" class="h-5 w-5" />
                  Enviar pedido por WhatsApp
                </a>
              }
              <button type="button" class="enlace-toque mx-auto mt-1 flex text-sm font-bold text-papel-300 transition hover:text-papel-50" (click)="pedido.vaciar()">
                Vaciar el pedido
              </button>
            </footer>
          } @else {
            <div class="flex flex-col items-center px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8 text-center">
              <app-sticker nombre="mascota-pensando" class="h-28" />
              <p class="mt-4 font-display text-3xl font-extrabold uppercase leading-none text-papel-50">Aquí no hay nada todavía</p>
              <p class="mt-2 max-w-xs text-papel-300">Toca una hamburguesa del menú y agrégala a tu pedido.</p>
              <a href="#menu" class="boton-fuego mt-6" (click)="cerrar()">Ver el menú</a>
            </div>
          }
        </div>
      }
    </dialog>
  `,
})
export class PedidoComponent {
  protected readonly pedido = inject(PedidoService);
  protected readonly negocio = inject(NegocioService);
  protected readonly promos = inject(PromoService);
  protected readonly club = inject(ClubService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly dialogo = viewChild<ElementRef<HTMLDialogElement>>('dialogo');

  /** El contenido solo existe con la ventana abierta (se mantiene mientras corre la animación de cierre). */
  readonly visible = signal(false);
  readonly precio = formatoPrecio;
  readonly entregas: { id: Entrega; texto: string }[] = [
    { id: 'domicilio', texto: 'A domicilio' },
    { id: 'recoger', texto: 'Paso a recogerlo' },
  ];
  /** Los cupones viven en Firestore: sin su configuración no se ofrecen. */
  readonly cupones = firebaseListo;
  /** El campo del cupón se muestra al tocar "¿Tienes un cupón?" (casi nadie tiene uno). */
  readonly verCupon = signal(false);
  readonly enTarjeta = computed(() => sellosEnTarjeta(this.club.cliente()?.sellos ?? 0, this.club.ajustes().sellos.meta));
  /** "10 % de descuento en tu primer pedido y un premio cada 8 pedidos" (vacío si el Club no ofrece nada). */
  readonly beneficio = computed(() => {
    const { descuento, sellos } = this.club.ajustes();
    const partes = [
      descuento.activo && descuento.porcentaje > 0 ? `${descuento.porcentaje} % de descuento ${descuento.soloPrimerPedido ? 'en tu primer pedido' : 'en tus pedidos'}` : '',
      sellos.activo ? `un premio cada ${sellos.meta} pedidos` : '',
    ].filter(Boolean);
    return partes.join(' y ');
  });
  /** Con cuenta del Club y dirección guardada, el mensaje ya la lleva. */
  readonly avisoEntrega = computed(() => {
    if (this.pedido.entrega() === 'recoger') return 'Te avisamos por el chat cuando esté listo.';
    return this.club.cliente()?.direccion
      ? 'Enviamos la dirección de tu cuenta. El valor del domicilio se confirma en el chat.'
      : 'La dirección y el valor del domicilio se confirman en el chat.';
  });
  /** ' (abre hoy a las 5:30 p. m.)' */
  readonly cuando = computed(() => {
    const detalle = this.negocio.estado().detalle;
    return detalle ? ` (${detalle})` : '';
  });

  constructor() {
    effect(() => {
      const abierto = this.pedido.abierto();
      untracked(() => (abierto ? this.mostrar() : this.ocultar()));
    });
    // Al volver de la cuenta (/?pedido) se abre de una vez el pedido que estaba armando.
    afterNextRender(() => {
      const consulta = new URLSearchParams(location.search);
      if (!consulta.has('pedido')) return;
      consulta.delete('pedido');
      const resto = consulta.toString();
      history.replaceState(history.state, '', `${location.pathname}${resto ? `?${resto}` : ''}${location.hash}`);
      if (this.pedido.activo) this.pedido.abierto.set(true);
    });
  }

  cerrar() {
    this.pedido.abierto.set(false);
  }

  /** Tocar fuera del panel (el fondo) cierra. */
  alTocar(evento: MouseEvent) {
    if (evento.target === this.dialogo()?.nativeElement) this.cerrar();
  }

  private mostrar() {
    const d = this.dialogo()?.nativeElement;
    if (!d) return;
    this.visible.set(true);
    d.classList.remove('cerrando');
    // Pinta el contenido antes de abrir: así showModal() pone el foco en "Cerrar el pedido".
    this.cd.detectChanges();
    if (!d.open) d.showModal();
  }

  private ocultar() {
    const d = this.dialogo()?.nativeElement;
    if (!d?.open) return;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    d.classList.add('cerrando');
    setTimeout(
      () => {
        if (this.pedido.abierto()) return;
        d.close();
        d.classList.remove('cerrando');
        this.visible.set(false);
      },
      reducido ? 0 : 220,
    );
  }
}
