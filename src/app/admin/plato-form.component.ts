import { ChangeDetectionStrategy, Component, type OnInit, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconoComponent } from '../compartido/icono.component';
import { mensajeDeError } from '../firebase/errores';
import { PlatoImagenComponent } from '../menu/ilustracion/plato-imagen.component';
import type { CapaHamburguesa, Categoria, EtiquetaPlato, Ilustracion, Plato, TipoPan, TonoPlato } from '../menu/menu.model';
import { subirImagen } from './imagenes';

const CAPAS: { id: CapaHamburguesa; texto: string }[] = [
  { id: 'carne', texto: 'Carne' }, { id: 'pollo', texto: 'Pollo' }, { id: 'vegetal', texto: 'Vegetal' },
  { id: 'queso', texto: 'Queso' }, { id: 'queso-crema', texto: 'Queso crema' }, { id: 'tocineta', texto: 'Tocineta' },
  { id: 'mermelada-tocineta', texto: 'Mermelada de tocineta' }, { id: 'lechuga', texto: 'Lechuga' }, { id: 'tomate', texto: 'Tomate' },
  { id: 'cebolla', texto: 'Cebolla' }, { id: 'cebolla-caramelizada', texto: 'Cebolla caramelizada' }, { id: 'jalapeno', texto: 'Jalapeño' },
  { id: 'pepinillos', texto: 'Pepinillos' }, { id: 'maduro', texto: 'Maduro' }, { id: 'huevo', texto: 'Huevo' }, { id: 'salsa', texto: 'Salsa' },
];
const ETIQUETAS: { id: EtiquetaPlato; texto: string }[] = [
  { id: 'nuevo', texto: 'Nuevo' }, { id: 'favorito', texto: 'Favorito' }, { id: 'vegetariano', texto: 'Vegetariano' }, { id: 'sin-gluten', texto: 'Sin gluten' },
];
const TONOS: TonoPlato[] = ['verde', 'amarillo', 'naranja', 'rojo', 'verde-oscuro'];

/** Lo que se edita: el plato con las listas como texto (un ingrediente por renglón). */
interface Borrador {
  plato: Plato;
  ingredientes: string;
  alergenos: string;
  limitado: boolean;
  dibujo: 'auto' | Ilustracion['tipo'];
  pan: TipoPan;
  capas: CapaHamburguesa[];
  colorBebida: string;
}

/** Editor de un producto (nuevo o existente), con vista previa de su foto o dibujo. */
@Component({
  selector: 'app-plato-form',
  imports: [FormsModule, IconoComponent, PlatoImagenComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="tarjeta p-5 sm:p-6" (ngSubmit)="enviar()">
      <header class="flex items-start justify-between gap-3">
        <h2 class="font-display text-3xl font-extrabold uppercase leading-none text-papel-50">{{ nuevo() ? 'Nuevo producto' : 'Editar ' + b.plato.nombre }}</h2>
        <button type="button" class="boton-icono" aria-label="Cerrar sin guardar" (click)="cerrar.emit()"><app-icono nombre="cerrar" class="h-5 w-5" /></button>
      </header>

      <div class="mt-5 grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="sm:col-span-2">
            <span class="campo-rotulo">Nombre</span>
            <input class="campo" name="nombre" required maxlength="60" [(ngModel)]="b.plato.nombre" (ngModelChange)="tocar()" />
          </label>
          <label>
            <span class="campo-rotulo">Categoría</span>
            <select class="campo" name="categoria" [(ngModel)]="b.plato.categoriaId" (ngModelChange)="tocar()">
              @for (c of categorias(); track c.id) {
                <option [value]="c.id">{{ c.nombre }}</option>
              }
            </select>
          </label>
          <label>
            <span class="campo-rotulo">Estado</span>
            <select class="campo" name="estado" [(ngModel)]="b.plato.estado" (ngModelChange)="tocar()">
              <option value="disponible">Disponible</option>
              <option value="agotado">Agotado</option>
            </select>
          </label>
          <label>
            <span class="campo-rotulo">Precio{{ conCombo() ? ' sola' : '' }} (pesos)</span>
            <input class="campo cifras" name="precio" type="number" min="0" step="100" required [(ngModel)]="b.plato.precio" />
          </label>
          <label>
            <span class="campo-rotulo">Precio en combo <span class="normal-case tracking-normal text-papel-400">(vacío: sin combo)</span></span>
            <input class="campo cifras" name="combo" type="number" min="0" step="100" [(ngModel)]="b.plato.precioCombo" (ngModelChange)="tocar()" />
          </label>
          <label class="sm:col-span-2">
            <span class="campo-rotulo">Descripción</span>
            <textarea class="campo" name="descripcion" rows="3" maxlength="400" [(ngModel)]="b.plato.descripcion"></textarea>
          </label>
          <label class="sm:col-span-2">
            <span class="campo-rotulo">Frase final, en negrilla <span class="normal-case tracking-normal text-papel-400">(opcional)</span></span>
            <input class="campo" name="frase" maxlength="80" placeholder="¡Simplemente brutal!" [(ngModel)]="b.plato.frase" />
          </label>
          <label>
            <span class="campo-rotulo">Ingredientes <span class="normal-case tracking-normal text-papel-400">(uno por renglón)</span></span>
            <textarea class="campo" name="ingredientes" rows="5" [(ngModel)]="b.ingredientes"></textarea>
          </label>
          <label>
            <span class="campo-rotulo">Alérgenos <span class="normal-case tracking-normal text-papel-400">(solo si están confirmados)</span></span>
            <textarea class="campo" name="alergenos" rows="5" placeholder="Gluten&#10;Lácteos" [(ngModel)]="b.alergenos"></textarea>
          </label>

          <fieldset class="sm:col-span-2">
            <legend class="campo-rotulo">Etiquetas</legend>
            <div class="flex flex-wrap gap-2">
              @for (e of etiquetas; track e.id) {
                <button type="button" class="chip" [attr.aria-pressed]="tieneEtiqueta(e.id)" (click)="alternarEtiqueta(e.id)">{{ e.texto }}</button>
              }
              <label class="chip">
                Picante
                <select class="bg-transparent" name="picante" [(ngModel)]="b.plato.picante">
                  <option [ngValue]="0">No</option><option [ngValue]="1">1</option><option [ngValue]="2">2</option><option [ngValue]="3">3</option>
                </select>
              </label>
            </div>
          </fieldset>

          <div class="grid gap-3 sm:col-span-2 sm:grid-cols-2">
            <label class="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-fondo-950/40 p-3.5 text-sm text-papel-100">
              <span>Destacado ("La estrella de la casa")</span>
              <input type="checkbox" name="destacado" class="peer sr-only" [(ngModel)]="b.plato.destacado" /><span class="interruptor"></span>
            </label>
            <label class="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-fondo-950/40 p-3.5 text-sm text-papel-100">
              <span>Mostrar las adiciones en su detalle</span>
              <input type="checkbox" name="adiciones" class="peer sr-only" [(ngModel)]="b.plato.conAdiciones" /><span class="interruptor"></span>
            </label>
            <label class="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-fondo-950/40 p-3.5 text-sm text-papel-100">
              <span>Ocultar de la carta (sin borrarlo)</span>
              <input type="checkbox" name="oculto" class="peer sr-only" [(ngModel)]="b.plato.oculto" (ngModelChange)="tocar()" /><span class="interruptor"></span>
            </label>
            <div class="rounded-2xl bg-fondo-950/40 p-3.5 text-sm text-papel-100">
              <label class="flex cursor-pointer items-center justify-between gap-3">
                <span>Por tiempo limitado</span>
                <input type="checkbox" name="limitado" class="peer sr-only" [(ngModel)]="b.limitado" /><span class="interruptor"></span>
              </label>
              @if (b.limitado) {
                <input class="campo mt-2" type="date" name="hasta" aria-label="Hasta" [ngModel]="b.plato.tiempoLimitado?.hasta" (ngModelChange)="b.plato.tiempoLimitado = { hasta: $event || undefined }" />
              }
            </div>
          </div>

          @if (conTono()) {
            <fieldset class="sm:col-span-2">
              <legend class="campo-rotulo">Color de la tarjeta</legend>
              <div class="flex flex-wrap gap-2">
                @for (t of tonos; track t) {
                  <button type="button" class="h-11 w-11 rounded-full border-2 transition" [class]="'tono-' + t" [style.background]="'var(--tono-fondo)'"
                          [class.border-papel-50]="b.plato.tono === t" [class.border-transparent]="b.plato.tono !== t" [attr.aria-label]="t" [attr.aria-pressed]="b.plato.tono === t"
                          (click)="b.plato.tono = t; tocar()"></button>
                }
              </div>
            </fieldset>
          }
        </div>

        <aside class="flex flex-col gap-4">
          <div class="overflow-hidden rounded-2xl border border-papel-100/10 bg-fondo-950/60">
            <app-plato-imagen class="aspect-[5/4]" [plato]="vista()" />
          </div>
          <label class="boton-linea cursor-pointer !text-sm" [class.opacity-60]="subiendo()">
            <app-icono nombre="subir" class="h-4 w-4 text-destello-400" />
            {{ subiendo() ? 'Subiendo…' : b.plato.foto ? 'Cambiar la foto' : 'Subir foto' }}
            <input type="file" accept="image/*" class="sr-only" [disabled]="subiendo()" (change)="subir($event)" />
          </label>
          @if (b.plato.foto; as foto) {
            <label class="flex cursor-pointer items-center justify-between gap-3 text-sm text-papel-100">
              <span>Foto con fondo transparente</span>
              <input type="checkbox" name="recortada" class="peer sr-only" [(ngModel)]="foto.recortada" (ngModelChange)="tocar()" /><span class="interruptor"></span>
            </label>
            <label>
              <span class="campo-rotulo">Qué muestra la foto</span>
              <input class="campo" name="alt" maxlength="160" [(ngModel)]="foto.alt" />
            </label>
            <button type="button" class="enlace-toque text-sm font-bold text-primario-200 underline underline-offset-4" (click)="b.plato.foto = undefined; tocar()">Quitar la foto (sale el dibujo)</button>
          } @else {
            <label>
              <span class="campo-rotulo">Dibujo</span>
              <select class="campo" name="dibujo" [(ngModel)]="b.dibujo" (ngModelChange)="tocar()">
                <option value="auto">Según la categoría</option>
                <option value="hamburguesa">Hamburguesa</option>
                <option value="combo">Combo</option>
                <option value="papas">Papas</option>
                <option value="aros">Aros de cebolla</option>
                <option value="bebida">Bebida</option>
                <option value="postre">Postre</option>
              </select>
            </label>
            @if (b.dibujo === 'hamburguesa' || b.dibujo === 'combo') {
              <label>
                <span class="campo-rotulo">Pan</span>
                <select class="campo" name="pan" [(ngModel)]="b.pan" (ngModelChange)="tocar()">
                  <option value="brioche">Brioche</option><option value="ajonjoli">Ajonjolí</option><option value="negro">Negro</option><option value="lechuga">Envuelta en lechuga</option>
                </select>
              </label>
              <fieldset>
                <legend class="campo-rotulo">Capas</legend>
                <div class="flex flex-wrap gap-1.5">
                  @for (c of capas; track c.id) {
                    <button type="button" class="chip !min-h-9 !px-3 !text-xs" [attr.aria-pressed]="b.capas.includes(c.id)" (click)="alternarCapa(c.id)">{{ c.texto }}</button>
                  }
                </div>
              </fieldset>
            }
            @if (b.dibujo === 'bebida') {
              <label class="flex items-center justify-between gap-3 text-sm text-papel-100">
                <span>Color del líquido</span>
                <input type="color" name="color" class="h-11 w-16 rounded-xl bg-transparent" [(ngModel)]="b.colorBebida" (ngModelChange)="tocar()" />
              </label>
            }
          }
        </aside>
      </div>

      @if (error(); as e) {
        <p class="mt-4 rounded-2xl bg-primario-500/15 p-3.5 text-sm text-primario-100" role="alert">{{ e }}</p>
      }
      <div class="mt-6 flex flex-wrap gap-3">
        <button type="submit" class="boton-fuego" [disabled]="subiendo()">{{ nuevo() ? 'Agregar a la carta' : 'Guardar el producto' }}</button>
        <button type="button" class="boton-linea" (click)="cerrar.emit()">Cancelar</button>
      </div>
      <p class="mt-3 text-xs text-papel-400">Queda en el borrador: la página cambia al tocar "Publicar cambios".</p>
    </form>
  `,
})
export class PlatoFormComponent implements OnInit {
  /** El producto a editar (se trabaja sobre una copia). */
  readonly plato = input.required<Plato>();
  readonly categorias = input.required<Categoria[]>();
  readonly nuevo = input(false);
  readonly guardar = output<Plato>();
  readonly cerrar = output<void>();

  readonly capas = CAPAS;
  readonly etiquetas = ETIQUETAS;
  readonly tonos = TONOS;
  readonly subiendo = signal(false);
  readonly error = signal('');
  /** Cambia con lo que se ve en la vista previa (para recalcularla). */
  private readonly cambios = signal(0);

  b!: Borrador;

  readonly conCombo = computed(() => {
    this.cambios();
    return !!this.b?.plato.precioCombo;
  });
  /** El color de tarjeta solo se usa en las categorías estilo cartel. */
  readonly conTono = computed(() => {
    this.cambios();
    return this.categorias().find((c) => c.id === this.b?.plato.categoriaId)?.estilo === 'cartel';
  });
  readonly vista = computed<Plato>(() => {
    this.cambios();
    return this.armar();
  });

  ngOnInit() {
    const p = structuredClone(this.plato());
    const ilustracion = p.ilustracion;
    this.b = {
      plato: { ...p, estado: p.estado ?? 'disponible', picante: p.picante ?? 0 },
      ingredientes: p.ingredientes.join('\n'),
      alergenos: (p.alergenos ?? []).join('\n'),
      limitado: !!p.tiempoLimitado,
      dibujo: ilustracion?.tipo ?? 'auto',
      pan: ilustracion && 'pan' in ilustracion ? (ilustracion.pan ?? 'brioche') : 'brioche',
      capas: ilustracion && 'capas' in ilustracion ? [...ilustracion.capas] : ['carne', 'queso', 'lechuga'],
      colorBebida: ilustracion?.tipo === 'bebida' ? (ilustracion.color ?? '#3B160C') : '#3B160C',
    };
    this.tocar();
  }

  tocar() {
    this.cambios.update((n) => n + 1);
  }

  tieneEtiqueta(id: EtiquetaPlato): boolean {
    return this.b.plato.etiquetas?.includes(id) ?? false;
  }

  alternarEtiqueta(id: EtiquetaPlato) {
    const actuales = this.b.plato.etiquetas ?? [];
    this.b.plato.etiquetas = actuales.includes(id) ? actuales.filter((e) => e !== id) : [...actuales, id];
  }

  alternarCapa(id: CapaHamburguesa) {
    this.b.capas = this.b.capas.includes(id) ? this.b.capas.filter((c) => c !== id) : [...this.b.capas, id];
    this.tocar();
  }

  async subir(evento: Event) {
    const campo = evento.target as HTMLInputElement;
    const archivo = campo.files?.[0];
    campo.value = '';
    if (!archivo) return;
    this.subiendo.set(true);
    this.error.set('');
    try {
      const imagen = await subirImagen(archivo, 'platos', 960, 480);
      this.b.plato.foto = { ...imagen, recortada: archivo.type === 'image/png', alt: this.b.plato.foto?.alt ?? this.b.plato.nombre };
      this.tocar();
    } catch (e) {
      this.error.set(e instanceof Error && !('code' in e) ? e.message : mensajeDeError(e));
    } finally {
      this.subiendo.set(false);
    }
  }

  enviar() {
    const plato = this.armar();
    if (plato.nombre.length < 2) return this.error.set('Ponle nombre al producto.');
    if (!(plato.precio >= 0)) return this.error.set('Revisa el precio.');
    this.guardar.emit(plato);
  }

  /** El plato con lo que dice el formulario (listas, dibujo y campos vacíos limpios). */
  private armar(): Plato {
    const b = this.b;
    if (!b) return this.plato();
    const lineas = (texto: string) => texto.split(/\n|,/).map((t) => t.trim()).filter(Boolean);
    const p: Plato = {
      ...b.plato,
      nombre: b.plato.nombre.trim(),
      precio: Math.max(0, Math.round(Number(b.plato.precio) || 0)),
      precioCombo: Number(b.plato.precioCombo) > 0 ? Math.round(Number(b.plato.precioCombo)) : undefined,
      ingredientes: lineas(b.ingredientes),
      alergenos: lineas(b.alergenos).length ? lineas(b.alergenos) : undefined,
      frase: b.plato.frase?.trim() || undefined,
      tiempoLimitado: b.limitado ? { hasta: b.plato.tiempoLimitado?.hasta || undefined } : undefined,
      etiquetas: b.plato.etiquetas?.length ? b.plato.etiquetas : undefined,
      picante: Number(b.plato.picante) ? (Number(b.plato.picante) as Plato['picante']) : undefined,
      destacado: b.plato.destacado || undefined,
      conAdiciones: b.plato.conAdiciones || undefined,
      oculto: b.plato.oculto || undefined,
      estado: b.plato.estado === 'agotado' ? 'agotado' : undefined,
      ilustracion: this.dibujo(),
    };
    return p;
  }

  private dibujo(): Ilustracion | undefined {
    const b = this.b;
    switch (b.dibujo) {
      case 'hamburguesa':
        return { tipo: 'hamburguesa', pan: b.pan, capas: b.capas.length ? b.capas : ['carne'] };
      case 'combo':
        return { tipo: 'combo', pan: b.pan, capas: b.capas.length ? b.capas : ['carne'] };
      case 'papas':
        return { tipo: 'papas', estilo: 'francesa' };
      case 'aros':
        return { tipo: 'aros', cantidad: 5 };
      case 'bebida':
        return { tipo: 'bebida', estilo: 'botella', color: b.colorBebida };
      case 'postre':
        return { tipo: 'postre', estilo: 'brownie' };
      default:
        return undefined;
    }
  }
}
