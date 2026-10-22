import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { IconoCategoria, Ilustracion, Plato } from '../menu.model';
import { dibujar } from './dibujos';

const POR_CATEGORIA: Record<IconoCategoria, Ilustracion> = {
  hamburguesa: { tipo: 'hamburguesa', capas: ['carne', 'queso', 'lechuga'] },
  combo: { tipo: 'combo', capas: ['carne', 'queso', 'lechuga'] },
  papas: { tipo: 'papas' },
  bebida: { tipo: 'bebida', estilo: 'gaseosa' },
  postre: { tipo: 'postre', estilo: 'brownie' },
  compartir: { tipo: 'aros' },
};

/** Resplandor de fondo según el tipo de plato. */
const FONDOS: Record<Ilustracion['tipo'], string> = {
  hamburguesa: 'from-primario-500/45 via-primario-800/30',
  combo: 'from-secundario-500/45 via-primario-800/30',
  papas: 'from-destello-500/35 via-secundario-800/30',
  aros: 'from-destello-500/35 via-secundario-800/30',
  bebida: 'from-secundario-400/35 via-fondo-700/40',
  postre: 'from-primario-400/35 via-fondo-700/40',
};

/**
 * Foto del plato (WebP con ancho y alto, dos tamaños y carga diferida) o, si no tiene foto, su ilustración.
 * Las fotos recortadas (fondo transparente) se muestran completas sobre el resplandor o sobre la tarjeta.
 */
@Component({
  selector: 'app-plato-imagen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block overflow-hidden', '[class.grayscale]': 'agotado()', '[class.opacity-70]': 'agotado()' },
  template: `
    @if (!sinFondo() && (!plato().foto || plato().foto?.recortada)) {
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_95%,var(--tw-gradient-stops))] to-transparent" [class]="fondo()"></div>
    }
    @if (plato().foto; as foto) {
      <img class="relative block h-full w-full" [class]="foto.recortada ? 'object-contain object-bottom' : 'object-cover'"
           [src]="foto.src" [attr.srcset]="srcset()" [attr.sizes]="srcset() ? tamanos() : null"
           [width]="foto.ancho" [height]="foto.alto" [alt]="foto.alt ?? plato().nombre"
           [attr.loading]="prioridad() ? 'eager' : 'lazy'" decoding="async" [attr.fetchpriority]="prioridad() ? 'high' : null" />
    } @else {
      <svg class="relative block h-full w-full" [class]="zoomMovil() ? 'max-sm:scale-125' : ''" viewBox="0 0 200 160" role="img"
           [attr.aria-label]="'Ilustración: ' + plato().nombre">
        @for (g of grupos(); track $index) {
          <g [attr.transform]="g.transform ?? null">
            @for (p of g.partes; track $index) {
              <path [attr.d]="p.d" [attr.fill]="p.relleno ?? 'none'" [attr.stroke]="p.trazo ?? null"
                    [attr.stroke-width]="p.grosor ?? null" [attr.opacity]="p.opacidad ?? null"
                    [attr.fill-rule]="p.evenodd ? 'evenodd' : null" stroke-linecap="round" stroke-linejoin="round" />
            }
          </g>
        }
      </svg>
    }
    @if (marcarEjemplo() && plato().ejemplo) {
      <span class="absolute bottom-2 left-2 z-[1] rounded-full border border-dashed border-papel-100/50 bg-fondo-950/75 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-papel-200 backdrop-blur-sm"
            aria-hidden="true">Ejemplo</span>
    }
  `,
})
export class PlatoImagenComponent {
  plato = input.required<Plato>();
  /** Icono de la categoría, para escoger el dibujo si el plato no tiene foto ni ilustración. */
  icono = input<IconoCategoria>('hamburguesa');
  /** Carga inmediata (imágenes que se ven al abrir la página). */
  prioridad = input(false);
  /** Acerca el dibujo en celular (miniaturas cuadradas de la lista). */
  zoomMovil = input(false);
  /** Muestra la marca "Ejemplo" sobre la imagen si el plato es de demostración. */
  marcarEjemplo = input(true);
  /** Sin el resplandor de fondo (sobre tarjetas de color). */
  sinFondo = input(false);
  /** Ancho con el que se muestra la foto (atributo `sizes`), para que el navegador elija el tamaño justo. */
  tamanos = input('(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 88vw');

  readonly agotado = computed(() => this.plato().estado === 'agotado');
  readonly ilustracion = computed(() => this.plato().ilustracion ?? POR_CATEGORIA[this.icono()]);
  readonly grupos = computed(() => (this.plato().foto ? [] : dibujar(this.ilustracion())));
  readonly fondo = computed(() => FONDOS[this.ilustracion().tipo]);
  readonly srcset = computed(() => {
    const foto = this.plato().foto;
    return foto?.pequena ? `${foto.pequena.src} ${foto.pequena.ancho}w, ${foto.src} ${foto.ancho}w` : null;
  });
}
