import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { fechaCorta } from '../club/club';
import { IconoComponent } from '../compartido/icono.component';
import { CLIENTE } from '../config/cliente';
import type { Promocion } from '../config/modelo';
import { mensajeDeError } from '../firebase/errores';
import { formatoPrecio } from '../menu/precio';
import { fechaColombia } from '../negocio/promocion';
import { CartaAdminService } from './carta-admin.service';
import { subirImagen } from './imagenes';
import { idNuevo } from './menu-admin.component';

/**
 * Promos y banners de temporada (Halloween, Navidad, el mes del padre…). Se pueden dejar programadas: cada una sale
 * sola entre sus fechas (la primera de la lista si se cruzan) con su ventana, el botón del inicio y el sello en su
 * plato. Una promo sin precio sirve de banner (un aviso de temporada con su afiche).
 */
@Component({
  selector: 'app-promos-admin',
  imports: [FormsModule, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (editando(); as e) {
      <form class="tarjeta p-5 sm:p-6" (ngSubmit)="guardar()">
        <header class="flex items-start justify-between gap-3">
          <h2 class="font-display text-3xl font-extrabold uppercase leading-none text-papel-50">{{ e.nueva ? 'Nueva promo o banner' : 'Editar promo' }}</h2>
          <button type="button" class="boton-icono" aria-label="Cerrar sin guardar" (click)="editando.set(null)"><app-icono nombre="cerrar" class="h-5 w-5" /></button>
        </header>
        <div class="mt-5 grid gap-6 lg:grid-cols-[1fr_15rem]">
          <div class="grid gap-4 sm:grid-cols-2">
            <label>
              <span class="campo-rotulo">Rótulo corto</span>
              <input class="campo" name="etiqueta" required maxlength="30" placeholder="Promo de diciembre" [(ngModel)]="e.promo.etiqueta" />
            </label>
            <label>
              <span class="campo-rotulo">Frase de arriba <span class="normal-case tracking-normal text-papel-400">(opcional)</span></span>
              <input class="campo" name="antetitulo" maxlength="60" placeholder="No hay truco, solo trato" [(ngModel)]="e.promo.antetitulo" />
            </label>
            <label class="sm:col-span-2">
              <span class="campo-rotulo">Qué se ofrece</span>
              <input class="campo" name="titulo" required maxlength="60" placeholder="2 Ron & Bacon" [(ngModel)]="e.promo.titulo" />
            </label>
            <label>
              <span class="campo-rotulo">Precio <span class="normal-case tracking-normal text-papel-400">(vacío: banner sin precio)</span></span>
              <input class="campo cifras" name="precio" type="number" min="0" step="100" [(ngModel)]="e.promo.precio" />
            </label>
            <label>
              <span class="campo-rotulo">Plato de la promo <span class="normal-case tracking-normal text-papel-400">(opcional)</span></span>
              <select class="campo" name="plato" [(ngModel)]="e.promo.platoId">
                <option [ngValue]="undefined">Ninguno</option>
                @for (p of platos(); track p.id) { <option [ngValue]="p.id">{{ p.nombre }}</option> }
              </select>
            </label>
            @if (e.promo.platoId) {
              <label>
                <span class="campo-rotulo">Cuántos combos de ese plato trae</span>
                <input class="campo cifras" name="cantidad" type="number" min="1" max="10" [(ngModel)]="e.promo.cantidad" />
              </label>
            }
            <label class="sm:col-span-2">
              <span class="campo-rotulo">Qué trae, en una frase</span>
              <input class="campo" name="detalle" maxlength="120" placeholder="Son 2 combos: cada uno con papas y gaseosa." [(ngModel)]="e.promo.detalle" />
            </label>
            <label class="sm:col-span-2">
              <span class="campo-rotulo">Condiciones</span>
              <textarea class="campo" name="nota" rows="2" maxlength="240" placeholder="Válida todo diciembre. Disponible en el local y a domicilio." [(ngModel)]="e.promo.nota"></textarea>
            </label>
            <label>
              <span class="campo-rotulo">Desde</span>
              <input class="campo" name="desde" type="date" required [(ngModel)]="e.promo.vigencia.desde" />
            </label>
            <label>
              <span class="campo-rotulo">Hasta (incluido)</span>
              <input class="campo" name="hasta" type="date" required [(ngModel)]="e.promo.vigencia.hasta" />
            </label>
            <label class="sm:col-span-2">
              <span class="campo-rotulo">Mensaje de WhatsApp <span class="normal-case tracking-normal text-papel-400">(opcional)</span></span>
              <input class="campo" name="mensaje" maxlength="200" [placeholder]="'Hola, ' + negocio + '. Quiero la promo: ' + (e.promo.titulo || '…') + '.'" [(ngModel)]="e.promo.mensajeWhatsApp" />
            </label>
            <label class="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-fondo-950/40 p-3.5 text-sm text-papel-100 sm:col-span-2">
              <span>Encendida (sale en sus fechas)</span>
              <input type="checkbox" name="activa" class="peer sr-only" [ngModel]="e.promo.activa !== false" (ngModelChange)="e.promo.activa = $event" /><span class="interruptor"></span>
            </label>
          </div>

          <aside class="flex flex-col gap-3">
            <div class="grid aspect-[9/16] place-items-center overflow-hidden rounded-2xl border border-papel-100/10 bg-fondo-950/60">
              @if (e.promo.afiche.src) {
                <img [src]="e.promo.afiche.pequena?.src ?? e.promo.afiche.src" alt="" class="h-full w-full object-contain" />
              } @else {
                <p class="p-4 text-center text-sm text-papel-400">El afiche (vertical, como una historia de Instagram).</p>
              }
            </div>
            <label class="boton-linea cursor-pointer !text-sm" [class.opacity-60]="subiendo()">
              <app-icono nombre="subir" class="h-4 w-4 text-destello-400" />
              {{ subiendo() ? 'Subiendo…' : e.promo.afiche.src ? 'Cambiar el afiche' : 'Subir el afiche' }}
              <input type="file" accept="image/*" class="sr-only" [disabled]="subiendo()" (change)="subir($event)" />
            </label>
            <label>
              <span class="campo-rotulo">Qué muestra el afiche</span>
              <textarea class="campo" name="alt" rows="3" maxlength="240" placeholder="Para quien no ve la imagen" [(ngModel)]="e.promo.afiche.alt"></textarea>
            </label>
          </aside>
        </div>
        @if (error(); as err) {
          <p class="mt-4 rounded-2xl bg-primario-500/15 p-3.5 text-sm text-primario-100" role="alert">{{ err }}</p>
        }
        <div class="mt-6 flex flex-wrap gap-3">
          <button type="submit" class="boton-fuego" [disabled]="subiendo()">{{ e.nueva ? 'Agregar' : 'Guardar' }}</button>
          <button type="button" class="boton-linea" (click)="editando.set(null)">Cancelar</button>
        </div>
        <p class="mt-3 text-xs text-papel-400">Queda en el borrador: la página cambia al tocar "Publicar cambios".</p>
      </form>
    } @else {
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-4xl font-extrabold uppercase leading-none text-papel-50">Promos y banners</h1>
          <p class="mt-1 max-w-2xl text-sm text-papel-300">
            Cada una sale sola entre sus fechas: deja programada la de la próxima temporada. Si dos se cruzan, sale la de más arriba.
            Enlace para historias y estados: <span class="font-semibold text-papel-100">{{ enlace }}</span>
          </p>
        </div>
        <button type="button" class="boton-fuego !min-h-11 !py-2 !text-sm" (click)="nueva()"><app-icono nombre="mas" [grosor]="2.2" class="h-4 w-4" /> Nueva</button>
      </div>

      <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (p of promos(); track p.id; let primera = $first; let ultima = $last) {
          <li class="tarjeta flex gap-4 p-4">
            <img [src]="p.afiche.pequena?.src ?? p.afiche.src" alt="" class="h-36 w-20 shrink-0 rounded-xl object-cover" loading="lazy" />
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="etiqueta self-start" [class]="estado(p).clase">{{ estado(p).texto }}</span>
              <p class="mt-2 font-bold leading-snug text-papel-50">{{ p.etiqueta }}: {{ p.titulo }}</p>
              <p class="text-sm text-papel-300">
                @if (p.precio) { {{ precio(p.precio) }} · }
                {{ corta(p.vigencia.desde) }} – {{ corta(p.vigencia.hasta) }}
              </p>
              <div class="mt-auto flex gap-1.5 pt-3">
                <button type="button" class="boton-icono !h-10 !w-10" aria-label="Subir" [disabled]="primera" (click)="mover(p, -1)"><app-icono nombre="flecha-arriba" class="h-4 w-4" /></button>
                <button type="button" class="boton-icono !h-10 !w-10" aria-label="Bajar" [disabled]="ultima" (click)="mover(p, 1)"><app-icono nombre="flecha-abajo" class="h-4 w-4" /></button>
                <button type="button" class="boton-icono !h-10 !w-10" [attr.aria-label]="'Editar ' + p.titulo" (click)="editar(p)"><app-icono nombre="editar" class="h-4 w-4" /></button>
                <button type="button" class="boton-icono !h-10 !w-10" [attr.aria-label]="'Borrar ' + p.titulo" (click)="borrar(p)"><app-icono nombre="borrar" class="h-4 w-4" /></button>
              </div>
            </div>
          </li>
        } @empty {
          <li class="text-papel-300">No hay promos. Crea la de esta temporada con "Nueva".</li>
        }
      </ul>
    }
  `,
})
export class PromosAdminComponent {
  private readonly cartas = inject(CartaAdminService);
  readonly promos = computed(() => this.cartas.borrador()?.promociones ?? []);
  readonly platos = computed(() => (this.cartas.borrador()?.menu.platos ?? []).filter((p) => p.precioCombo || p.precio));
  readonly editando = signal<{ promo: Promocion; nueva: boolean } | null>(null);
  readonly subiendo = signal(false);
  readonly error = signal('');
  readonly precio = formatoPrecio;
  readonly corta = fechaCorta;
  readonly negocio = CLIENTE.nombreCorto;
  readonly enlace = `${CLIENTE.sitio.url}/?promo`;

  estado(p: Promocion): { texto: string; clase: string } {
    const hoy = fechaColombia();
    if (p.activa === false) return { texto: 'Apagada', clase: 'bg-papel-100/10 text-papel-300' };
    if (hoy > p.vigencia.hasta) return { texto: 'Vencida', clase: 'bg-papel-100/10 text-papel-300' };
    if (hoy < p.vigencia.desde) return { texto: `Desde el ${fechaCorta(p.vigencia.desde)}`, clase: 'bg-secundario-500/20 text-secundario-200' };
    const primera = this.promos().find((x) => x.activa !== false && hoy >= x.vigencia.desde && hoy <= x.vigencia.hasta);
    return primera === p ? { texto: 'En la página', clase: 'bg-destello-400 text-sobre-destello' } : { texto: 'En fechas (tapada por otra)', clase: 'bg-secundario-500/20 text-secundario-200' };
  }

  nueva() {
    const hoy = fechaColombia();
    this.error.set('');
    this.editando.set({
      nueva: true,
      promo: { id: '', etiqueta: '', titulo: '', vigencia: { desde: hoy, hasta: hoy }, afiche: { src: '', ancho: 1080, alto: 1920, alt: '' }, activa: true },
    });
  }

  editar(p: Promocion) {
    this.error.set('');
    this.editando.set({ promo: structuredClone(p), nueva: false });
  }

  async subir(evento: Event) {
    const campo = evento.target as HTMLInputElement;
    const archivo = campo.files?.[0];
    const e = this.editando();
    campo.value = '';
    if (!archivo || !e) return;
    this.subiendo.set(true);
    this.error.set('');
    try {
      const imagen = await subirImagen(archivo, 'promos', 1080, 720);
      e.promo.afiche = { ...imagen, alt: e.promo.afiche.alt };
    } catch (err) {
      this.error.set(err instanceof Error && !('code' in err) ? err.message : mensajeDeError(err));
    } finally {
      this.subiendo.set(false);
    }
  }

  guardar() {
    const e = this.editando();
    if (!e) return;
    const p = e.promo;
    const falta = !p.etiqueta?.trim() ? 'el rótulo' : !p.titulo?.trim() ? 'qué se ofrece' : !p.afiche.src ? 'el afiche' : !p.afiche.alt?.trim() ? 'qué muestra el afiche' : '';
    if (falta) return this.error.set(`Falta ${falta}.`);
    if (!p.vigencia.desde || !p.vigencia.hasta || p.vigencia.hasta < p.vigencia.desde) return this.error.set('Revisa las fechas: "hasta" no puede ser antes de "desde".');
    const promo: Promocion = {
      ...p,
      precio: Number(p.precio) > 0 ? Math.round(Number(p.precio)) : undefined,
      cantidad: p.platoId ? Math.max(1, Math.round(Number(p.cantidad) || 1)) : undefined,
      antetitulo: p.antetitulo?.trim() || undefined,
      detalle: p.detalle?.trim() || undefined,
      nota: p.nota?.trim() || undefined,
      mensajeWhatsApp: p.mensajeWhatsApp?.trim() || undefined,
    };
    this.cartas.cambiar((carta) => {
      if (e.nueva) {
        const id = idNuevo(`${promo.titulo} ${promo.vigencia.desde.slice(0, 7)}`, carta.promociones.map((x) => x.id));
        carta.promociones.unshift({ ...promo, id });
      } else {
        carta.promociones = carta.promociones.map((x) => (x.id === promo.id ? promo : x));
      }
      return carta;
    });
    this.editando.set(null);
  }

  mover(p: Promocion, paso: number) {
    this.cartas.cambiar((carta) => {
      const i = carta.promociones.findIndex((x) => x.id === p.id);
      const j = i + paso;
      if (j >= 0 && j < carta.promociones.length) [carta.promociones[i], carta.promociones[j]] = [carta.promociones[j], carta.promociones[i]];
      return carta;
    });
  }

  borrar(p: Promocion) {
    if (!confirm(`¿Borrar "${p.etiqueta}: ${p.titulo}"? Si solo quieres que no salga, apágala.`)) return;
    this.cartas.cambiar((carta) => {
      carta.promociones = carta.promociones.filter((x) => x.id !== p.id);
      return carta;
    });
  }
}
