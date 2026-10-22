import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { IconoComponent, type NombreIcono } from '../../compartido/icono.component';
import { RevelarDirective } from '../../compartido/revelar.directive';
import { StickerComponent } from '../../compartido/sticker.component';
import { hayRotulo } from '../../marca/rotulo.component';
import type { Categoria, IconoCategoria, Plato } from '../../menu/menu.model';
import { MenuService } from '../../menu/menu.service';
import { PedidoService } from '../../pedido/pedido.service';
import { ComboTarjetaComponent } from './combo-tarjeta.component';
import { DestacadosComponent } from './destacados.component';
import { ListaPlatosComponent } from './lista-platos.component';
import { PlatoCartelComponent } from './plato-cartel.component';
import { PlatoTarjetaComponent } from './plato-tarjeta.component';

const ICONO_CATEGORIA: Record<IconoCategoria, NombreIcono> = {
  hamburguesa: 'hamburguesa',
  combo: 'combo',
  papas: 'papas',
  bebida: 'bebida',
  postre: 'postre',
  compartir: 'compartir',
};

@Component({
  selector: 'app-carta',
  imports: [IconoComponent, RevelarDirective, StickerComponent, PlatoTarjetaComponent, ComboTarjetaComponent, DestacadosComponent, PlatoCartelComponent, ListaPlatosComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './carta.component.html',
})
export class CartaComponent {
  protected readonly menu = inject(MenuService);
  protected readonly pedido = inject(PedidoService);
  private readonly destruir = inject(DestroyRef);
  readonly iconos = ICONO_CATEGORIA;

  readonly buscador = viewChild.required<ElementRef<HTMLInputElement>>('buscador');
  readonly barra = viewChild.required<ElementRef<HTMLElement>>('barra');
  readonly lista = viewChild.required<ElementRef<HTMLElement>>('lista');

  /** Categoría que se está viendo (resalta su botón en la barra pegajosa). */
  readonly activa = signal<string | null>(null);

  readonly resumen = computed(() => {
    const total = this.menu.resultados().length;
    return total === 1 ? '1 plato' : `${total} platos`;
  });

  constructor() {
    this.destruir.onDestroy(() => this.observador?.disconnect());

    // Al cambiar la categoría activa, la barra se desliza para mostrar su botón.
    effect(() => {
      const id = this.activa();
      untracked(() => {
        const barra = this.barra().nativeElement;
        const boton = id ? barra.querySelector<HTMLElement>(`[data-categoria="${id}"]`) : null;
        if (!boton) return;
        barra.scrollTo({ left: boton.offsetLeft - (barra.clientWidth - boton.offsetWidth) / 2, behavior: this.suave() });
      });
    });

    // Los filtros cambian qué secciones existen: se vuelven a observar.
    effect(() => {
      this.menu.grupos();
      untracked(() => queueMicrotask(() => this.observarCategorias()));
    });
  }

  /** Las listas con rótulo llevan su título dibujado dentro del panel. */
  tituloEnPanel(categoria: Categoria): boolean {
    return categoria.estilo === 'lista' && hayRotulo(categoria.id);
  }

  tieneCombo(platos: Plato[]): boolean {
    return platos.some((p) => p.precioCombo);
  }

  buscar(texto: string) {
    this.menu.actualizar({ texto });
  }

  limpiarBusqueda() {
    this.menu.actualizar({ texto: '' });
    this.buscador().nativeElement.focus();
  }

  /** Lo usa la barra inferior ("Buscar"). */
  enfocarBuscador() {
    const campo = this.buscador().nativeElement;
    campo.scrollIntoView({ behavior: this.suave(), block: 'center' });
    campo.focus({ preventScroll: true });
  }

  irA(id: string) {
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: this.suave(), block: 'start' });
    this.activa.set(id);
  }

  imprimir() {
    window.print();
  }

  private suave(): ScrollBehavior {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  private observador?: IntersectionObserver;
  private visibles = new Set<string>();

  private observarCategorias() {
    this.observador?.disconnect();
    if (!('IntersectionObserver' in window)) return;
    const secciones = [...this.lista().nativeElement.querySelectorAll<HTMLElement>('[data-seccion]')];
    this.visibles.clear();
    const alto = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--alto-barra')) || 60;
    this.observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          const id = (e.target as HTMLElement).dataset['seccion']!;
          if (e.isIntersecting) this.visibles.add(id);
          else this.visibles.delete(id);
        }
        const primera = secciones.find((s) => this.visibles.has(s.dataset['seccion']!));
        if (primera) this.activa.set(primera.dataset['seccion']!);
      },
      // Franja justo debajo de las barras pegajosas.
      { rootMargin: `-${alto + 72}px 0px -60% 0px` },
    );
    secciones.forEach((s) => this.observador!.observe(s));
    if (!this.activa() && secciones[0]) this.activa.set(secciones[0].dataset['seccion']!);
  }
}
