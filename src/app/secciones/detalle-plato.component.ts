import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { CantidadComponent } from '../compartido/cantidad.component';
import { IconoComponent } from '../compartido/icono.component';
import { RedSocialComponent } from '../compartido/red-social.component';
import { RotuloComponent } from '../marca/rotulo.component';
import { DetalleService } from '../menu/detalle.service';
import { PlatoImagenComponent } from '../menu/ilustracion/plato-imagen.component';
import { MenuService } from '../menu/menu.service';
import { formatoAdicional, formatoPrecio } from '../menu/precio';
import { NegocioService } from '../negocio/negocio.service';
import type { Variante } from '../pedido/pedido';
import { PedidoService } from '../pedido/pedido.service';
import { EtiquetasPlatoComponent } from './carta/etiquetas-plato.component';
import { PreciosPlatoComponent } from './carta/precios-plato.component';

/** Detalle del plato: hoja inferior en celular (se puede arrastrar hacia abajo para cerrar), ventana en escritorio. */
@Component({
  selector: 'app-detalle-plato',
  imports: [IconoComponent, RedSocialComponent, PlatoImagenComponent, EtiquetasPlatoComponent, PreciosPlatoComponent, RotuloComponent, CantidadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialogo class="hoja" aria-labelledby="detalle-titulo" (cancel)="$event.preventDefault(); detalle.cerrar()" (click)="alTocar($event)">
      @if (plato(); as p) {
        <div class="hoja-panel relative mx-auto flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[1.75rem] border border-b-0 border-papel-100/10 bg-fondo-900 shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.8)] md:max-h-[calc(100dvh-48px)] md:rounded-[1.75rem] md:border-b"
             [style.transform]="desplazamiento() ? 'translateY(' + desplazamiento() + 'px)' : null"
             [style.transition]="arrastrando() ? 'none' : 'transform .25s ease'">
          <!-- Asa para arrastrar (celular) -->
          <div class="absolute inset-x-0 top-0 z-10 flex h-10 cursor-grab touch-none justify-center pt-2.5 md:hidden" aria-hidden="true"
               (pointerdown)="empezarArrastre($event)">
            <span class="h-1.5 w-12 rounded-full bg-papel-50/50 shadow"></span>
          </div>
          <button type="button" class="boton-icono absolute right-3 top-3 z-20 !bg-fondo-950/70 backdrop-blur" aria-label="Cerrar detalle" (click)="detalle.cerrar()">
            <app-icono nombre="cerrar" [grosor]="2.2" class="h-5 w-5" />
          </button>

          <div class="overflow-y-auto overscroll-contain md:flex md:overflow-hidden">
            <app-plato-imagen [plato]="p" [icono]="icono()" [prioridad]="true" [marcarEjemplo]="false" [sinFondo]="!!p.tono"
              tamanos="(min-width: 768px) 24rem, 100vw"
              class="aspect-[16/11] w-full px-8 pt-10 md:aspect-auto md:min-h-[26rem] md:w-[46%] md:shrink-0 md:px-6 md:py-10"
              [class]="p.tono ? 'tono-' + p.tono + ' bg-[var(--tono-fondo)]' : 'bg-fondo-800'" />

            <div class="p-5 pb-[calc(1.75rem+env(safe-area-inset-bottom))] sm:p-7 md:overflow-y-auto md:overscroll-contain" [class]="pedido.activo ? '!pb-0' : ''">
              <app-etiquetas-plato [plato]="p" [completas]="true" class="mb-3 empty:hidden" />
              <h2 id="detalle-titulo" class="pr-10 font-display text-[2.3rem] font-extrabold uppercase leading-[0.9] text-papel-50 sm:text-5xl md:pr-12">
                <app-rotulo [clave]="p.id" [texto]="p.nombre" class="[--alto:3rem] sm:[--alto:3.5rem]" />
              </h2>
              @if (p.precioCombo) {
                <app-precios-plato [plato]="p" [grande]="true" class="mt-5" />
                @if (notaCombo()) {
                  <p class="mt-3 flex items-start gap-2 text-sm leading-snug text-papel-300">
                    <app-icono nombre="combo" class="mt-0.5 h-4 w-4 text-destello-400" />
                    {{ notaCombo() }}
                  </p>
                }
              } @else {
                <p class="cifras mt-3 font-display text-4xl font-extrabold leading-none text-destello-400">{{ precio() }}</p>
              }
              @if (p.descripcion) {
                <p class="mt-4 text-[15px] leading-relaxed text-papel-200">
                  {{ p.descripcion }}
                  @if (p.frase) {
                    <strong class="font-extrabold italic text-papel-50">{{ p.frase }}</strong>
                  }
                </p>
              }

              <!-- Pedido por WhatsApp: cómo la quiere (el botón de agregar va fijo abajo) -->
              @if (pedido.activo && p.precioCombo && p.estado !== 'agotado') {
                <h3 class="mt-6 text-xs font-extrabold uppercase tracking-[0.2em] text-papel-300">¿Cómo la quieres?</h3>
                <div class="mt-2.5 grid grid-cols-2 gap-2" role="group" aria-label="Sola o en combo">
                  <button type="button" class="opcion" [attr.aria-pressed]="variante() === 'sola'" (click)="variante.set('sola')">
                    Sola <span class="cifras font-semibold opacity-80">{{ precio() }}</span>
                  </button>
                  <button type="button" class="opcion" [attr.aria-pressed]="variante() === 'combo'" (click)="elegirCombo()">
                    En combo <span class="cifras font-semibold opacity-80">{{ precioCombo() }}</span>
                  </button>
                </div>
                @if (variante() === 'combo' && pedido.acompanamientos().length > 1) {
                  <p class="mt-4 text-sm font-semibold text-papel-200">Tu combo va con gaseosa y…</p>
                  <div id="detalle-acompanamiento" class="mt-2 grid scroll-mb-24 grid-cols-2 gap-2" role="group" aria-label="Acompañamiento del combo">
                    @for (a of pedido.acompanamientos(); track a) {
                      <button type="button" class="opcion" [attr.aria-pressed]="con() === a" (click)="con.set(a)">{{ a }}</button>
                    }
                  </div>
                }
              }

              @if (p.estado === 'agotado') {
                <p class="mt-4 flex items-start gap-2.5 rounded-2xl bg-primario-500/15 p-3.5 text-sm font-semibold text-primario-200">
                  <app-icono nombre="agotado" class="mt-0.5 h-5 w-5 text-primario-300" />
                  Por hoy se nos agotó. Pregunta en el local si vuelve pronto.
                </p>
              }

              @if (p.incluye?.length) {
                <h3 class="mt-6 text-xs font-extrabold uppercase tracking-[0.2em] text-papel-300">Incluye</h3>
                <ul class="mt-2.5 space-y-2">
                  @for (item of p.incluye; track item) {
                    <li class="flex items-start gap-2.5 text-[15px] text-papel-100">
                      <app-icono nombre="check" [grosor]="2.4" class="mt-0.5 h-5 w-5 text-fresco-400" />
                      {{ item }}
                    </li>
                  }
                </ul>
              } @else if (p.ingredientes.length) {
                <h3 class="mt-6 text-xs font-extrabold uppercase tracking-[0.2em] text-papel-300">Ingredientes</h3>
                <ul class="mt-2.5 flex flex-wrap gap-2">
                  @for (item of p.ingredientes; track item) {
                    <li class="rounded-full border border-papel-100/15 bg-fondo-800/80 px-3 py-1.5 text-sm text-papel-100">{{ item }}</li>
                  }
                </ul>
              }

              @if (p.alergenos?.length) {
                <div class="mt-6 flex gap-3 rounded-2xl border border-destello-400/30 bg-destello-400/[0.07] p-4">
                  <app-icono nombre="alerta" class="mt-0.5 h-5 w-5 text-destello-400" />
                  <div class="text-sm leading-relaxed">
                    <h3 class="font-bold text-papel-50">Alérgenos</h3>
                    <p class="text-papel-200">Contiene: {{ p.alergenos!.join(', ') }}.</p>
                    <p class="mt-1 text-papel-300">Si tienes alguna alergia, avísanos antes de pedir.</p>
                  </div>
                </div>
              }

              @if (p.adicionales?.length) {
                <h3 class="mt-6 text-xs font-extrabold uppercase tracking-[0.2em] text-papel-300">Adiciones</h3>
                <ul class="mt-2 divide-y divide-papel-100/10 rounded-2xl border border-papel-100/10 bg-fondo-950/40">
                  @for (a of p.adicionales; track a.nombre) {
                    <li class="flex min-h-12 items-center justify-between gap-3 px-4 text-[15px]">
                      <span class="flex items-center gap-2.5 text-papel-100">
                        <app-icono nombre="mas" [grosor]="2.2" class="h-4 w-4 text-secundario-400" />
                        {{ a.nombre }}
                      </span>
                      <span class="cifras font-bold text-destello-300">{{ adicional(a.precio) }}</span>
                    </li>
                  }
                </ul>
              }

              @if (p.ejemplo) {
                <p class="mt-6 flex items-start gap-2.5 rounded-2xl border border-dashed border-papel-100/25 p-3.5 text-sm text-papel-300">
                  <app-icono nombre="alerta" class="mt-0.5 h-4 w-4" />
                  Plato de ejemplo: el nombre, los ingredientes y el precio son provisionales.
                </p>
              }

              <div class="mt-7 flex flex-col gap-3 xs:flex-row">
                <button type="button" class="boton-linea flex-1" (click)="compartir()">
                  <app-icono [nombre]="copiado() ? 'check' : 'enviar'" class="h-5 w-5 text-destello-400" />
                  {{ copiado() ? 'Enlace copiado' : 'Compartir' }}
                </button>
                @if (whatsapp(); as enlace) {
                  <a class="boton-brasa flex-1" [href]="enlace" target="_blank" rel="noopener">
                    <app-red-social red="whatsapp" class="h-5 w-5" />
                    Preguntar por WhatsApp
                  </a>
                }
              </div>

              @if (pedido.activo) {
                <div class="sticky bottom-0 z-10 -mx-5 mt-6 flex items-center gap-3 border-t border-papel-100/10 bg-fondo-900/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-7 sm:px-7">
                  @if (p.estado === 'agotado') {
                    <p class="flex min-h-12 flex-1 items-center justify-center rounded-full border border-papel-100/15 text-sm font-bold text-papel-300">Agotada por hoy</p>
                  } @else {
                    <app-cantidad [valor]="cantidad()" [minimo]="1" [de]="p.nombre" (cambio)="cantidad.set(cantidad() + $event)" />
                    <button type="button" class="boton-fuego min-w-0 flex-1 !px-4" (click)="agregar()">
                      Agregar <span class="cifras">· {{ subtotal() }}</span>
                    </button>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }
    </dialog>
  `,
})
export class DetallePlatoComponent {
  protected readonly detalle = inject(DetalleService);
  protected readonly pedido = inject(PedidoService);
  private readonly menu = inject(MenuService);
  private readonly negocio = inject(NegocioService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly dialogo = viewChild<ElementRef<HTMLDialogElement>>('dialogo');

  /** Plato que se muestra (se mantiene mientras corre la animación de cierre). */
  readonly plato = signal(this.detalle.abierto());
  readonly icono = computed(() => {
    const p = this.plato();
    return (p && this.menu.categoria(p.categoriaId)?.icono) || 'hamburguesa';
  });
  readonly precio = computed(() => formatoPrecio(this.plato()?.precio ?? 0));
  readonly precioCombo = computed(() => formatoPrecio(this.plato()?.precioCombo ?? 0));
  /** Lo que se va a agregar al pedido: sola o en combo, con qué acompañamiento y cuántas. */
  readonly variante = signal<Variante>('sola');
  readonly con = signal('');
  readonly cantidad = signal(1);
  readonly subtotal = computed(() => {
    const p = this.plato();
    const unidad = p ? (this.variante() === 'combo' && p.precioCombo ? p.precioCombo : p.precio) : 0;
    return formatoPrecio(unidad * this.cantidad());
  });
  readonly notaCombo = this.menu.notaCombo;
  readonly whatsapp = computed(() => {
    const p = this.plato();
    return p ? this.negocio.whatsappSobre(p.nombre) : null;
  });
  readonly copiado = signal(false);
  readonly desplazamiento = signal(0);
  readonly arrastrando = signal(false);

  constructor() {
    effect(() => {
      const plato = this.detalle.abierto();
      untracked(() => (plato ? this.mostrar(plato) : this.ocultar()));
    });
  }

  adicional(valor: number) {
    return formatoAdicional(valor);
  }

  /** Tocar fuera del panel (el fondo) cierra. */
  alTocar(evento: MouseEvent) {
    if (evento.target === this.dialogo()?.nativeElement) this.detalle.cerrar();
  }

  /** Al pasar a combo aparece el acompañamiento: se trae a la vista (en celular queda bajo el botón fijo). */
  elegirCombo() {
    this.variante.set('combo');
    this.cd.detectChanges();
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('detalle-acompanamiento')?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'nearest' });
  }

  /** Agrega al pedido lo elegido y cierra: la barra "Ver pedido" queda a la vista. */
  agregar() {
    const p = this.plato();
    if (!p) return;
    this.pedido.agregarPlato(p, p.precioCombo ? this.variante() : 'sola', this.cantidad(), this.con());
    this.detalle.cerrar();
  }

  async compartir() {
    const p = this.plato();
    if (!p) return;
    const url = this.detalle.enlace(p);
    const datos = { title: `${p.nombre} · Rootfire Burgers`, text: `${p.nombre} en Rootfire Burgers`, url };
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(datos))) {
        await navigator.share(datos);
        return;
      }
      await navigator.clipboard.writeText(url);
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2200);
    } catch {
      // Compartir cancelado o portapapeles bloqueado: no hace falta avisar.
    }
  }

  empezarArrastre(inicio: PointerEvent) {
    const y0 = inicio.clientY;
    this.arrastrando.set(true);
    const mover = (e: PointerEvent) => this.desplazamiento.set(Math.max(0, e.clientY - y0));
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
      this.arrastrando.set(false);
      if (this.desplazamiento() > 110) this.detalle.cerrar();
      else this.desplazamiento.set(0);
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
  }

  private mostrar(plato: NonNullable<ReturnType<DetalleService['abierto']>>) {
    this.plato.set(plato);
    this.desplazamiento.set(0);
    this.copiado.set(false);
    this.variante.set('sola');
    this.con.set(this.pedido.acompanamientos()[0] ?? '');
    this.cantidad.set(1);
    const d = this.dialogo()?.nativeElement;
    if (!d) return;
    d.classList.remove('cerrando');
    // Pinta el contenido antes de abrir: así showModal() pone el foco en "Cerrar detalle".
    this.cd.detectChanges();
    if (!d.open) d.showModal();
    // Al cambiar de plato con la hoja abierta, vuelve arriba.
    queueMicrotask(() => d.querySelectorAll('.overflow-y-auto').forEach((el) => (el.scrollTop = 0)));
  }

  private ocultar() {
    const d = this.dialogo()?.nativeElement;
    if (!d?.open) return;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    d.classList.add('cerrando');
    setTimeout(
      () => {
        // Si en ese instante se abrió otro plato, la hoja se queda abierta.
        if (this.detalle.abierto()) return;
        d.close();
        d.classList.remove('cerrando');
        this.plato.set(null);
        this.desplazamiento.set(0);
        this.detalle.devolverFoco();
      },
      reducido ? 0 : 220,
    );
  }
}
