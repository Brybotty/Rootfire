import { Injectable, computed, inject, signal } from '@angular/core';
import { menuParaVer } from '../carta/carta';
import { CartaService } from '../carta/carta.service';
import {
  FILTROS_VACIOS,
  type Filtros,
  agruparPorCategoria,
  esPicante,
  esSinGluten,
  esVegetariano,
  filtrarPlatos,
  filtrosActivos,
  hayFiltros,
  ordenarPlatos,
  rangosDePrecio,
} from './filtros';
import type { Categoria, Menu, Plato } from './menu.model';

/**
 * Estado del menú: la carta, la búsqueda y los filtros (todo con signals, sin esperas).
 * El menú sale de la carta (CartaService: Firestore, su copia o config/menu.ts); cuando el admin lo cambia,
 * todo lo demás se recalcula solo.
 */
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly cartas = inject(CartaService);
  readonly menu = computed<Menu>(() => menuParaVer(this.cartas.carta().menu));

  readonly categorias = computed(() => [...this.menu().categorias].sort((a, b) => a.orden - b.orden));
  readonly platos = computed(() => ordenarPlatos(this.menu().platos, this.categorias()));
  readonly rangos = computed(() => rangosDePrecio(this.menu().rangosPrecio));
  readonly destacados = computed(() => this.platos().filter((p) => p.destacado));
  readonly hayEjemplos = computed(() => this.platos().some((p) => p.ejemplo));
  readonly notaCombo = computed(() => this.menu().notaCombo ?? '');
  /** Los filtros de dieta solo se muestran si algún plato los cumple. */
  readonly dietas = computed(() => {
    const platos = this.platos();
    return { vegetariano: platos.some(esVegetariano), picante: platos.some(esPicante), sinGluten: platos.some(esSinGluten) };
  });
  readonly hayDietas = computed(() => Object.values(this.dietas()).some(Boolean));
  /** Precio más bajo de la primera categoría (p. ej. "Hamburguesas desde $ 15.000"). */
  readonly desde = computed(() => {
    const primera = this.categorias()[0];
    const precios = this.platos().filter((p) => p.categoriaId === primera?.id).map((p) => p.precio);
    return primera && precios.length ? { categoria: primera.nombre, precio: Math.min(...precios) } : null;
  });

  readonly filtros = signal<Filtros>(FILTROS_VACIOS);
  readonly resultados = computed(() => filtrarPlatos(this.platos(), this.categorias(), this.filtros(), this.rangos()));
  readonly grupos = computed(() => agruparPorCategoria(this.resultados(), this.categorias()));
  readonly filtrando = computed(() => hayFiltros(this.filtros()));
  readonly cuantosFiltros = computed(() => filtrosActivos(this.filtros()));

  private readonly porId = computed(() => new Map(this.platos().map((p) => [p.id, p])));
  private readonly categoriaPorId = computed(() => new Map(this.categorias().map((c) => [c.id, c])));

  actualizar(cambios: Partial<Filtros>) {
    this.filtros.update((f) => ({ ...f, ...cambios }));
  }

  alternar(filtro: 'vegetariano' | 'picante' | 'sinGluten') {
    this.filtros.update((f) => ({ ...f, [filtro]: !f[filtro] }));
  }

  elegirPrecio(id: string) {
    this.filtros.update((f) => ({ ...f, precio: f.precio === id ? null : id }));
  }

  limpiar() {
    this.filtros.set(FILTROS_VACIOS);
  }

  plato(id: string): Plato | undefined {
    return this.porId().get(id);
  }

  categoria(id: string): Categoria | undefined {
    return this.categoriaPorId().get(id);
  }
}
