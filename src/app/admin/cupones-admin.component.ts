import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { collection, deleteDoc, doc, getCountFromServer, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { fechaCorta, normalizarCodigo } from '../club/club';
import type { Cupon } from '../club/modelo';
import { IconoComponent } from '../compartido/icono.component';
import { mensajeDeError } from '../firebase/errores';
import { db } from '../firebase/sdk';
import { formatoPrecio } from '../menu/precio';
import { fechaColombia } from '../negocio/promocion';

interface CuponConUsos extends Cupon {
  /** Clientes del Club que ya lo usaron (solo se cuentan los de un solo uso). */
  usos?: number;
}

/**
 * Cupones de descuento. El código es la llave del documento (cupones/HALLOWEEN10): la página puede leer uno si
 * alguien sabe su código, pero nadie puede listarlos (firestore.rules). Un cupón descuenta sobre lo que no es promo
 * y no se suma al descuento del Club.
 */
@Component({
  selector: 'app-cupones-admin',
  imports: [FormsModule, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (editando(); as e) {
      <form class="tarjeta max-w-2xl p-5 sm:p-6" (ngSubmit)="guardar()">
        <header class="flex items-start justify-between gap-3">
          <h2 class="font-display text-3xl font-extrabold uppercase leading-none text-papel-50">{{ e.nuevo ? 'Nuevo cupón' : 'Cupón ' + e.cupon.codigo }}</h2>
          <button type="button" class="boton-icono" aria-label="Cerrar sin guardar" (click)="editando.set(null)"><app-icono nombre="cerrar" class="h-5 w-5" /></button>
        </header>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span class="campo-rotulo">Código</span>
            <input class="campo uppercase" name="codigo" required maxlength="20" placeholder="HALLOWEEN10" [disabled]="!e.nuevo" [(ngModel)]="e.cupon.codigo" />
          </label>
          <label>
            <span class="campo-rotulo">Descripción para el cliente</span>
            <input class="campo" name="descripcion" maxlength="80" placeholder="10 % en tu pedido de Halloween" [(ngModel)]="e.cupon.descripcion" />
          </label>
          <label>
            <span class="campo-rotulo">Tipo</span>
            <select class="campo" name="tipo" [(ngModel)]="e.cupon.tipo">
              <option value="porcentaje">Porcentaje</option>
              <option value="valor">Valor fijo en pesos</option>
            </select>
          </label>
          <label>
            <span class="campo-rotulo">{{ e.cupon.tipo === 'porcentaje' ? 'Porcentaje (1 a 100)' : 'Valor en pesos' }}</span>
            <input class="campo cifras" name="valor" type="number" required [min]="1" [max]="e.cupon.tipo === 'porcentaje' ? 100 : 1000000" [(ngModel)]="e.cupon.valor" />
          </label>
          <label>
            <span class="campo-rotulo">Desde</span>
            <input class="campo" name="desde" type="date" required [(ngModel)]="e.cupon.desde" />
          </label>
          <label>
            <span class="campo-rotulo">Hasta (incluido)</span>
            <input class="campo" name="hasta" type="date" required [(ngModel)]="e.cupon.hasta" />
          </label>
          <label class="sm:col-span-2">
            <span class="campo-rotulo">Pedido mínimo en pesos <span class="normal-case tracking-normal text-papel-400">(0: sin mínimo; sin contar promos)</span></span>
            <input class="campo cifras" name="minimo" type="number" min="0" step="1000" [(ngModel)]="e.cupon.minimo" />
          </label>
          <label class="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-fondo-950/40 p-3.5 text-sm text-papel-100">
            <span>Solo clientes del Club</span>
            <input type="checkbox" name="soloClub" class="peer sr-only" [(ngModel)]="e.cupon.soloClub" /><span class="interruptor"></span>
          </label>
          <label class="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-fondo-950/40 p-3.5 text-sm text-papel-100">
            <span>Una vez por cliente <span class="block text-xs text-papel-400">Exige cuenta del Club</span></span>
            <input type="checkbox" name="unUso" class="peer sr-only" [(ngModel)]="e.cupon.unUso" /><span class="interruptor"></span>
          </label>
          <label class="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-fondo-950/40 p-3.5 text-sm text-papel-100 sm:col-span-2">
            <span>Activo</span>
            <input type="checkbox" name="activo" class="peer sr-only" [(ngModel)]="e.cupon.activo" /><span class="interruptor"></span>
          </label>
        </div>
        @if (error(); as err) {
          <p class="mt-4 rounded-2xl bg-primario-500/15 p-3.5 text-sm text-primario-100" role="alert">{{ err }}</p>
        }
        <div class="mt-6 flex flex-wrap gap-3">
          <button type="submit" class="boton-fuego" [disabled]="ocupado()">Guardar el cupón</button>
          <button type="button" class="boton-linea" (click)="editando.set(null)">Cancelar</button>
        </div>
        <p class="mt-3 text-xs text-papel-400">Los cupones se guardan de una vez (no esperan a "Publicar cambios").</p>
      </form>
    } @else {
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-4xl font-extrabold uppercase leading-none text-papel-50">Cupones</h1>
          <p class="mt-1 max-w-2xl text-sm text-papel-300">Compártelos en historias, estados o por mensaje a quienes aceptaron promociones. El cliente los escribe en "Tu pedido".</p>
        </div>
        <button type="button" class="boton-fuego !min-h-11 !py-2 !text-sm" (click)="nuevo()"><app-icono nombre="mas" [grosor]="2.2" class="h-4 w-4" /> Nuevo cupón</button>
      </div>
      @if (error(); as err) {
        <p class="mt-4 rounded-2xl bg-primario-500/15 p-3.5 text-sm text-primario-100" role="alert">{{ err }}</p>
      }
      @if (cargando()) {
        <p class="py-12 text-center text-papel-300" role="status">Cargando cupones…</p>
      } @else {
        <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (c of cupones(); track c.codigo) {
            <li class="tarjeta flex flex-col p-4" [class.opacity-60]="!vigente(c)">
              <div class="flex items-start justify-between gap-3">
                <p class="font-display text-3xl font-extrabold uppercase leading-none tracking-wide text-destello-300">{{ c.codigo }}</p>
                <span class="etiqueta" [class]="vigente(c) ? 'bg-fresco-500/20 text-fresco-200' : 'bg-papel-100/10 text-papel-300'">{{ c.activo ? (vigente(c) ? 'Vigente' : 'Fuera de fechas') : 'Apagado' }}</span>
              </div>
              <p class="mt-2 font-semibold text-papel-50">{{ c.tipo === 'porcentaje' ? c.valor + ' %' : precio(c.valor) }} de descuento</p>
              @if (c.descripcion) { <p class="text-sm text-papel-300">{{ c.descripcion }}</p> }
              <p class="mt-1 text-sm text-papel-400">
                {{ corta(c.desde) }} – {{ corta(c.hasta) }}
                @if (c.minimo) { · mínimo {{ precio(c.minimo) }} }
                @if (c.soloClub || c.unUso) { · Club }
                @if (c.unUso) { · 1 por cliente ({{ c.usos ?? 0 }} usados) }
              </p>
              <div class="mt-auto flex gap-2 pt-4">
                <button type="button" class="boton-linea !min-h-10 !px-4 !py-2 !text-sm" (click)="alternar(c)">{{ c.activo ? 'Apagar' : 'Encender' }}</button>
                <button type="button" class="boton-icono !h-10 !w-10" [attr.aria-label]="'Editar ' + c.codigo" (click)="editar(c)"><app-icono nombre="editar" class="h-4 w-4" /></button>
                <button type="button" class="boton-icono !h-10 !w-10" [attr.aria-label]="'Borrar ' + c.codigo" (click)="borrar(c)"><app-icono nombre="borrar" class="h-4 w-4" /></button>
              </div>
            </li>
          } @empty {
            <li class="text-papel-300">No hay cupones todavía.</li>
          }
        </ul>
      }
    }
  `,
})
export class CuponesAdminComponent {
  readonly cupones = signal<CuponConUsos[]>([]);
  readonly cargando = signal(true);
  readonly ocupado = signal(false);
  readonly error = signal('');
  readonly editando = signal<{ cupon: Cupon; nuevo: boolean } | null>(null);
  readonly precio = formatoPrecio;
  readonly corta = fechaCorta;

  constructor() {
    void this.cargar();
  }

  vigente(c: Cupon): boolean {
    const hoy = fechaColombia();
    return c.activo && hoy >= c.desde && hoy <= c.hasta;
  }

  nuevo() {
    const hoy = fechaColombia();
    this.error.set('');
    this.editando.set({ nuevo: true, cupon: { codigo: '', descripcion: '', tipo: 'porcentaje', valor: 10, minimo: 0, desde: hoy, hasta: hoy, activo: true, soloClub: false, unUso: false } });
  }

  editar(c: CuponConUsos) {
    const { usos: _, ...cupon } = c;
    this.error.set('');
    this.editando.set({ nuevo: false, cupon: { ...cupon } });
  }

  async guardar() {
    const e = this.editando();
    if (!e) return;
    const c = e.cupon;
    const codigo = normalizarCodigo(c.codigo);
    const valor = Math.round(Number(c.valor) || 0);
    if (!codigo) return this.error.set('El código lleva de 3 a 20 letras, números o guiones, sin espacios.');
    if (valor < 1 || (c.tipo === 'porcentaje' && valor > 100)) return this.error.set('Revisa el valor del descuento.');
    if (!c.desde || !c.hasta || c.hasta < c.desde) return this.error.set('Revisa las fechas: "hasta" no puede ser antes de "desde".');
    if (e.nuevo && this.cupones().some((x) => x.codigo === codigo)) return this.error.set('Ya existe un cupón con ese código.');
    const { codigo: _, ...datos } = { ...c, valor, minimo: Math.max(0, Math.round(Number(c.minimo) || 0)), descripcion: c.descripcion.trim(), soloClub: c.soloClub || c.unUso };
    this.ocupado.set(true);
    this.error.set('');
    try {
      await setDoc(doc(db(), 'cupones', codigo), datos);
      this.editando.set(null);
      await this.cargar();
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.ocupado.set(false);
    }
  }

  async alternar(c: Cupon) {
    try {
      await updateDoc(doc(db(), 'cupones', c.codigo), { activo: !c.activo });
      this.cupones.update((lista) => lista.map((x) => (x.codigo === c.codigo ? { ...x, activo: !c.activo } : x)));
    } catch (err) {
      this.error.set(mensajeDeError(err));
    }
  }

  async borrar(c: Cupon) {
    if (!confirm(`¿Borrar el cupón ${c.codigo}? Quien lo tenga ya no podrá usarlo.`)) return;
    try {
      await deleteDoc(doc(db(), 'cupones', c.codigo));
      this.cupones.update((lista) => lista.filter((x) => x.codigo !== c.codigo));
    } catch (err) {
      this.error.set(mensajeDeError(err));
    }
  }

  private async cargar() {
    this.cargando.set(true);
    try {
      const resultado = await getDocs(collection(db(), 'cupones'));
      const cupones = resultado.docs.map((d) => ({ ...(d.data() as Omit<Cupon, 'codigo'>), codigo: d.id }) as CuponConUsos);
      cupones.sort((a, b) => b.hasta.localeCompare(a.hasta));
      this.cupones.set(cupones);
      // Usos de los de un solo uso (una consulta de conteo por cupón: barata).
      for (const c of cupones.filter((x) => x.unUso)) {
        const conteo = await getCountFromServer(collection(db(), 'cupones', c.codigo, 'usos'));
        this.cupones.update((lista) => lista.map((x) => (x.codigo === c.codigo ? { ...x, usos: conteo.data().count } : x)));
      }
    } catch (err) {
      this.error.set(mensajeDeError(err));
    } finally {
      this.cargando.set(false);
    }
  }
}
