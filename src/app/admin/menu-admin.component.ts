import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Carta } from '../carta/carta';
import { IconoComponent } from '../compartido/icono.component';
import { normalizar } from '../menu/filtros';
import { PlatoImagenComponent } from '../menu/ilustracion/plato-imagen.component';
import type { Categoria, IconoCategoria, Plato, TonoPlato } from '../menu/menu.model';
import { CartaAdminService } from './carta-admin.service';
import { PlatoFormComponent } from './plato-form.component';

const ICONOS: IconoCategoria[] = ['hamburguesa', 'combo', 'papas', 'bebida', 'postre', 'compartir'];
const ESTILOS: { id: NonNullable<Categoria['estilo']>; texto: string }[] = [
  { id: 'cartel', texto: 'Tarjetas de color (como las hamburguesas)' },
  { id: 'lista', texto: 'Lista nombre ··· precio (adiciones, bebidas)' },
  { id: 'normal', texto: 'Tarjetas sencillas' },
  { id: 'combo', texto: 'Tiquete de papel kraft' },
];
const TONOS: TonoPlato[] = ['verde', 'amarillo', 'naranja', 'rojo', 'verde-oscuro'];

/** 'La Madurita' → 'la-madurita' (sin tildes ni símbolos), sin repetir uno que ya exista. */
export function idNuevo(nombre: string, existentes: string[]): string {
  const base = normalizar(nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'producto';
  let id = base;
  for (let n = 2; existentes.includes(id); n++) id = `${base}-${n}`;
  return id;
}

/**
 * Menú y precios: los precios se cambian en la misma fila; el resto del producto, en su editor. Categorías, orden
 * y ajustes del combo. Todo va al borrador hasta "Publicar cambios".
 */
@Component({
  selector: 'app-menu-admin',
  imports: [FormsModule, IconoComponent, PlatoImagenComponent, PlatoFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (editando(); as e) {
      <app-plato-form [plato]="e.plato" [categorias]="categorias()" [nuevo]="e.nuevo" (guardar)="guardarPlato($event, e.nuevo)" (cerrar)="editando.set(null)" />
    } @else if (carta(); as carta) {
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-4xl font-extrabold uppercase leading-none text-papel-50">Menú y precios</h1>
          <p class="mt-1 text-sm text-papel-300">{{ carta.menu.platos.length }} productos en {{ carta.menu.categorias.length }} categorías.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="boton-fuego !min-h-11 !py-2 !text-sm" (click)="nuevoPlato()"><app-icono nombre="mas" [grosor]="2.2" class="h-4 w-4" /> Agregar producto</button>
          <button type="button" class="boton-linea !min-h-11 !py-2 !text-sm" (click)="nuevaCategoria()"><app-icono nombre="mas" class="h-4 w-4" /> Categoría</button>
        </div>
      </div>

      @for (c of categorias(); track c.id; let primera = $first; let ultima = $last) {
        <section class="mt-8" [attr.aria-label]="c.nombre">
          <header class="flex flex-wrap items-center gap-2 border-b border-papel-100/10 pb-3">
            <h2 class="mr-auto font-display text-3xl font-extrabold uppercase leading-none text-papel-50">{{ c.nombre }}</h2>
            <button type="button" class="boton-icono !h-10 !w-10" aria-label="Subir la categoría" [disabled]="primera" (click)="moverCategoria(c, -1)"><app-icono nombre="flecha-arriba" class="h-4 w-4" /></button>
            <button type="button" class="boton-icono !h-10 !w-10" aria-label="Bajar la categoría" [disabled]="ultima" (click)="moverCategoria(c, 1)"><app-icono nombre="flecha-abajo" class="h-4 w-4" /></button>
            <button type="button" class="boton-icono !h-10 !w-10" aria-label="Editar la categoría" (click)="categoriaAbierta.set(categoriaAbierta() === c.id ? '' : c.id)"><app-icono nombre="editar" class="h-4 w-4" /></button>
          </header>

          @if (categoriaAbierta() === c.id) {
            <div class="mt-3 grid gap-4 rounded-2xl bg-fondo-900/80 p-4 sm:grid-cols-2">
              <label>
                <span class="campo-rotulo">Nombre</span>
                <input class="campo" [ngModel]="c.nombre" (ngModelChange)="cambiarCategoria(c.id, { nombre: $event })" maxlength="40" />
              </label>
              <label>
                <span class="campo-rotulo">Descripción (opcional)</span>
                <input class="campo" [ngModel]="c.descripcion ?? ''" (ngModelChange)="cambiarCategoria(c.id, { descripcion: $event || undefined })" maxlength="80" />
              </label>
              <label>
                <span class="campo-rotulo">Cómo se ve</span>
                <select class="campo" [ngModel]="c.estilo ?? 'normal'" (ngModelChange)="cambiarCategoria(c.id, { estilo: $event })">
                  @for (e of estilos; track e.id) { <option [value]="e.id">{{ e.texto }}</option> }
                </select>
              </label>
              <label>
                <span class="campo-rotulo">Ícono</span>
                <select class="campo" [ngModel]="c.icono" (ngModelChange)="cambiarCategoria(c.id, { icono: $event })">
                  @for (i of iconos; track i) { <option [value]="i">{{ i }}</option> }
                </select>
              </label>
              @if (c.estilo === 'lista') {
                <label>
                  <span class="campo-rotulo">Color del panel</span>
                  <select class="campo" [ngModel]="c.tono ?? 'verde-oscuro'" (ngModelChange)="cambiarCategoria(c.id, { tono: $event })">
                    @for (t of tonos; track t) { <option [value]="t">{{ t }}</option> }
                  </select>
                </label>
              }
              <div class="flex items-end">
                <button type="button" class="boton-linea !min-h-11 !py-2 !text-sm" [disabled]="cuantos(c.id) > 0" (click)="borrarCategoria(c)"
                        [title]="cuantos(c.id) ? 'Primero mueve o borra sus productos' : ''">
                  <app-icono nombre="borrar" class="h-4 w-4 text-primario-300" /> Borrar la categoría
                </button>
              </div>
            </div>
          }

          <ul class="mt-2 divide-y divide-papel-100/10">
            @for (p of platosDe(c.id); track p.id; let pp = $first; let up = $last) {
              <li class="flex flex-wrap items-center gap-3 py-3" [class.opacity-60]="p.oculto">
                <app-plato-imagen class="h-14 w-16 shrink-0 rounded-xl bg-fondo-900" [plato]="p" tamanos="64px" />
                <div class="min-w-0 flex-1 basis-40">
                  <p class="truncate font-bold text-papel-50">{{ p.nombre }}</p>
                  <p class="flex flex-wrap gap-1.5 text-xs">
                    @if (p.destacado) { <span class="etiqueta bg-destello-400/20 text-destello-200">Destacado</span> }
                    @if (p.oculto) { <span class="etiqueta bg-papel-100/10 text-papel-200">Oculto</span> }
                    @if (p.estado === 'agotado') { <span class="etiqueta bg-primario-500/20 text-primario-200">Agotado</span> }
                  </p>
                </div>
                <label class="w-28">
                  <span class="block text-[11px] font-bold uppercase tracking-wide text-papel-400">{{ p.precioCombo ? 'Sola' : 'Precio' }}</span>
                  <input class="campo cifras !rounded-xl !px-3 !py-2" type="number" min="0" step="100" [attr.aria-label]="'Precio de ' + p.nombre"
                         [value]="p.precio" (change)="cambiarPrecio(p.id, 'precio', $any($event.target).valueAsNumber)" />
                </label>
                @if (p.precioCombo) {
                  <label class="w-28">
                    <span class="block text-[11px] font-bold uppercase tracking-wide text-papel-400">Combo</span>
                    <input class="campo cifras !rounded-xl !px-3 !py-2" type="number" min="0" step="100" [attr.aria-label]="'Precio en combo de ' + p.nombre"
                           [value]="p.precioCombo" (change)="cambiarPrecio(p.id, 'precioCombo', $any($event.target).valueAsNumber)" />
                  </label>
                }
                <div class="flex items-center gap-1.5">
                  <button type="button" class="chip !min-h-10 !px-3 !text-xs" [attr.aria-pressed]="p.estado === 'agotado'" (click)="alternarAgotado(p)">Agotado</button>
                  <button type="button" class="boton-icono !h-10 !w-10" [attr.aria-label]="'Subir ' + p.nombre" [disabled]="pp" (click)="moverPlato(p, -1)"><app-icono nombre="flecha-arriba" class="h-4 w-4" /></button>
                  <button type="button" class="boton-icono !h-10 !w-10" [attr.aria-label]="'Bajar ' + p.nombre" [disabled]="up" (click)="moverPlato(p, 1)"><app-icono nombre="flecha-abajo" class="h-4 w-4" /></button>
                  <button type="button" class="boton-icono !h-10 !w-10" [attr.aria-label]="'Editar ' + p.nombre" (click)="editar(p)"><app-icono nombre="editar" class="h-4 w-4" /></button>
                  <button type="button" class="boton-icono !h-10 !w-10 hover:!border-primario-400" [attr.aria-label]="'Borrar ' + p.nombre" (click)="borrarPlato(p)"><app-icono nombre="borrar" class="h-4 w-4" /></button>
                </div>
              </li>
            } @empty {
              <li class="py-4 text-sm text-papel-400">Sin productos. Sin productos visibles, la categoría no sale en la carta.</li>
            }
          </ul>
        </section>
      }

      <section class="tarjeta mt-10 grid gap-4 p-5 sm:grid-cols-2" aria-labelledby="titulo-ajustes-menu">
        <h2 id="titulo-ajustes-menu" class="font-display text-3xl font-extrabold uppercase leading-none text-papel-50 sm:col-span-2">Combos y adiciones</h2>
        <label class="sm:col-span-2">
          <span class="campo-rotulo">Qué incluye el combo</span>
          <textarea class="campo" rows="2" maxlength="200" [ngModel]="carta.menu.notaCombo ?? ''" (ngModelChange)="cambiarMenu({ notaCombo: $event || undefined })"></textarea>
        </label>
        <label>
          <span class="campo-rotulo">Acompañamientos del combo <span class="normal-case tracking-normal text-papel-400">(uno por renglón)</span></span>
          <textarea class="campo" rows="3" [ngModel]="(carta.menu.acompanamientosCombo ?? []).join('\n')" (ngModelChange)="cambiarAcompanamientos($event)"></textarea>
        </label>
        <div class="grid gap-4">
          <label>
            <span class="campo-rotulo">Categoría de las adiciones</span>
            <select class="campo" [ngModel]="carta.menu.adicionesDe ?? ''" (ngModelChange)="cambiarMenu({ adicionesDe: $event || undefined })">
              <option value="">Ninguna</option>
              @for (c of categorias(); track c.id) { <option [value]="c.id">{{ c.nombre }}</option> }
            </select>
          </label>
          <fieldset>
            <legend class="campo-rotulo">Cortes del filtro de precio</legend>
            <div class="grid grid-cols-2 gap-3">
              @for (r of carta.menu.rangosPrecio; track $index; let i = $index) {
                <input class="campo cifras" type="number" min="0" step="1000" [attr.aria-label]="'Corte ' + (i + 1)" [value]="r" (change)="cambiarRango(i, $any($event.target).valueAsNumber)" />
              }
            </div>
          </fieldset>
        </div>
      </section>
    }
  `,
})
export class MenuAdminComponent {
  private readonly cartas = inject(CartaAdminService);
  readonly carta = this.cartas.borrador;
  readonly editando = signal<{ plato: Plato; nuevo: boolean } | null>(null);
  readonly categoriaAbierta = signal('');
  readonly estilos = ESTILOS;
  readonly iconos = ICONOS;
  readonly tonos = TONOS;

  readonly categorias = computed(() => [...(this.carta()?.menu.categorias ?? [])].sort((a, b) => a.orden - b.orden));

  platosDe(categoriaId: string): Plato[] {
    return (this.carta()?.menu.platos ?? []).filter((p) => p.categoriaId === categoriaId).sort((a, b) => a.orden - b.orden);
  }

  cuantos(categoriaId: string): number {
    return this.platosDe(categoriaId).length;
  }

  nuevoPlato() {
    const categoria = this.categorias()[0];
    if (!categoria) return this.nuevaCategoria();
    this.editando.set({
      nuevo: true,
      plato: { id: '', categoriaId: categoria.id, nombre: '', descripcion: '', ingredientes: [], precio: 0, orden: this.cuantos(categoria.id) + 1, conAdiciones: categoria.estilo === 'cartel' || undefined },
    });
  }

  editar(p: Plato) {
    this.editando.set({ plato: p, nuevo: false });
  }

  guardarPlato(plato: Plato, nuevo: boolean) {
    this.cambiar((carta) => {
      const platos = carta.menu.platos;
      if (nuevo) {
        platos.push({ ...plato, id: idNuevo(plato.nombre, platos.map((p) => p.id)), orden: this.cuantos(plato.categoriaId) + 1 });
      } else {
        const i = platos.findIndex((p) => p.id === plato.id);
        // Si cambió de categoría, va al final de la nueva.
        const orden = platos[i].categoriaId === plato.categoriaId ? plato.orden : this.cuantos(plato.categoriaId) + 1;
        platos[i] = { ...plato, orden };
      }
    });
    this.editando.set(null);
  }

  cambiarPrecio(id: string, campo: 'precio' | 'precioCombo', valor: number | null) {
    const precio = Math.max(0, Math.round(Number(valor) || 0));
    this.cambiarPlato(id, { [campo]: campo === 'precioCombo' && !precio ? undefined : precio });
  }

  alternarAgotado(p: Plato) {
    this.cambiarPlato(p.id, { estado: p.estado === 'agotado' ? undefined : 'agotado' });
  }

  moverPlato(p: Plato, paso: number) {
    const lista = this.platosDe(p.categoriaId);
    const i = lista.findIndex((x) => x.id === p.id);
    const otro = lista[i + paso];
    if (!otro) return;
    [lista[i], lista[i + paso]] = [otro, p];
    const ordenes = new Map(lista.map((x, n) => [x.id, n + 1]));
    this.cambiar((carta) => {
      carta.menu.platos = carta.menu.platos.map((x) => (ordenes.has(x.id) ? { ...x, orden: ordenes.get(x.id)! } : x));
    });
  }

  borrarPlato(p: Plato) {
    if (!confirm(`¿Borrar "${p.nombre}" de la carta? Si solo es por un tiempo, mejor márcalo como oculto o agotado.`)) return;
    this.cambiar((carta) => {
      carta.menu.platos = carta.menu.platos.filter((x) => x.id !== p.id);
    });
  }

  nuevaCategoria() {
    const nombre = prompt('Nombre de la nueva categoría (por ejemplo, Postres):')?.trim();
    if (!nombre) return;
    const id = idNuevo(nombre, this.categorias().map((c) => c.id));
    this.cambiar((carta) => {
      carta.menu.categorias.push({ id, nombre, icono: 'hamburguesa', orden: this.categorias().length + 1, estilo: 'normal' });
    });
    this.categoriaAbierta.set(id);
  }

  cambiarCategoria(id: string, cambios: Partial<Categoria>) {
    this.cambiar((carta) => {
      carta.menu.categorias = carta.menu.categorias.map((c) => (c.id === id ? { ...c, ...cambios } : c));
    });
  }

  moverCategoria(c: Categoria, paso: number) {
    const lista = this.categorias();
    const i = lista.findIndex((x) => x.id === c.id);
    if (!lista[i + paso]) return;
    [lista[i], lista[i + paso]] = [lista[i + paso], lista[i]];
    const ordenes = new Map(lista.map((x, n) => [x.id, n + 1]));
    this.cambiar((carta) => {
      carta.menu.categorias = carta.menu.categorias.map((x) => ({ ...x, orden: ordenes.get(x.id) ?? x.orden }));
    });
  }

  borrarCategoria(c: Categoria) {
    if (this.cuantos(c.id) || !confirm(`¿Borrar la categoría "${c.nombre}"?`)) return;
    this.cambiar((carta) => {
      carta.menu.categorias = carta.menu.categorias.filter((x) => x.id !== c.id);
    });
  }

  cambiarMenu(cambios: Partial<Carta['menu']>) {
    this.cambiar((carta) => {
      carta.menu = { ...carta.menu, ...cambios };
    });
  }

  cambiarAcompanamientos(texto: string) {
    this.cambiarMenu({ acompanamientosCombo: texto.split('\n').map((t) => t.trim()).filter(Boolean) });
  }

  cambiarRango(i: number, valor: number | null) {
    const rangos = [...(this.carta()?.menu.rangosPrecio ?? [])];
    rangos[i] = Math.max(0, Math.round(Number(valor) || 0));
    this.cambiarMenu({ rangosPrecio: rangos });
  }

  private cambiarPlato(id: string, cambios: Partial<Plato>) {
    this.cambiar((carta) => {
      carta.menu.platos = carta.menu.platos.map((p) => (p.id === id ? { ...p, ...cambios } : p));
    });
  }

  /** Cambia una copia del borrador (CartaAdminService.cambiar) y la deja como borrador nuevo. */
  private cambiar(cambio: (carta: Carta) => void) {
    this.cartas.cambiar((carta) => {
      cambio(carta);
      return carta;
    });
  }
}

