import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import type { AjustesClub } from '../config/modelo';
import { IconoComponent } from '../compartido/icono.component';
import { CLIENTE } from '../config/cliente';
import { mensajeDeError } from '../firebase/errores';
import { db } from '../firebase/sdk';
import { CartaAdminService } from './carta-admin.service';

/**
 * Club y ajustes: si el Club está encendido y qué ofrece (va en la carta, con "Publicar cambios"), y quién más entra
 * al panel (se guarda de una vez en `admins`).
 */
@Component({
  selector: 'app-club-admin',
  imports: [FormsModule, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (club(); as c) {
      <h1 class="font-display text-4xl font-extrabold uppercase leading-none text-papel-50">Club y ajustes</h1>
      <p class="mt-1 max-w-2xl text-sm text-papel-300">
        Registrarse es opcional para los clientes. Quien se registra puede tener un descuento y una tarjeta de sellos. Las
        condiciones salen solas en los <a href="/terminos#club" target="_blank" class="font-semibold text-papel-100 underline underline-offset-4">términos</a>.
      </p>

      <section class="tarjeta mt-6 grid gap-5 p-5 sm:p-6 lg:grid-cols-2" aria-label="Club">
        <label class="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-fondo-950/40 p-4 text-papel-100 lg:col-span-2">
          <span>
            <strong class="block text-papel-50">Club encendido</strong>
            <span class="text-sm text-papel-300">Apagado, la página no invita a registrarse ni aplica beneficios (las cuentas siguen ahí).</span>
          </span>
          <input type="checkbox" class="peer sr-only" [ngModel]="c.activo" (ngModelChange)="cambiar({ activo: $event })" /><span class="interruptor"></span>
        </label>
        <label class="lg:col-span-2">
          <span class="campo-rotulo">Nombre del Club</span>
          <input class="campo" maxlength="40" [ngModel]="c.nombre" (ngModelChange)="cambiar({ nombre: $event })" />
        </label>

        <fieldset class="grid gap-4 rounded-2xl border border-papel-100/10 p-4">
          <legend class="px-2 font-bold text-papel-50">Descuento por registrarse</legend>
          <label class="flex cursor-pointer items-center justify-between gap-3 text-sm text-papel-100">
            <span>Activo</span>
            <input type="checkbox" class="peer sr-only" [ngModel]="c.descuento.activo" (ngModelChange)="cambiarDescuento({ activo: $event })" /><span class="interruptor"></span>
          </label>
          <label>
            <span class="campo-rotulo">Porcentaje</span>
            <input class="campo cifras" type="number" min="0" max="100" [value]="c.descuento.porcentaje" (change)="cambiarDescuento({ porcentaje: numero($event, 0, 100) })" />
          </label>
          <label class="flex cursor-pointer items-center justify-between gap-3 text-sm text-papel-100">
            <span>Solo en el primer pedido</span>
            <input type="checkbox" class="peer sr-only" [ngModel]="c.descuento.soloPrimerPedido" (ngModelChange)="cambiarDescuento({ soloPrimerPedido: $event })" /><span class="interruptor"></span>
          </label>
          <label>
            <span class="campo-rotulo">Pedido mínimo en pesos <span class="normal-case tracking-normal text-papel-400">(0: sin mínimo)</span></span>
            <input class="campo cifras" type="number" min="0" step="1000" [value]="c.descuento.minimo" (change)="cambiarDescuento({ minimo: numero($event, 0, 10000000) })" />
          </label>
        </fieldset>

        <fieldset class="grid gap-4 rounded-2xl border border-papel-100/10 p-4">
          <legend class="px-2 font-bold text-papel-50">Tarjeta de sellos</legend>
          <label class="flex cursor-pointer items-center justify-between gap-3 text-sm text-papel-100">
            <span>Activa</span>
            <input type="checkbox" class="peer sr-only" [ngModel]="c.sellos.activo" (ngModelChange)="cambiarSellos({ activo: $event })" /><span class="interruptor"></span>
          </label>
          <label>
            <span class="campo-rotulo">Sellos para el premio</span>
            <input class="campo cifras" type="number" min="1" max="30" [value]="c.sellos.meta" (change)="cambiarSellos({ meta: numero($event, 1, 30) })" />
          </label>
          <label>
            <span class="campo-rotulo">Premio</span>
            <input class="campo" maxlength="80" [ngModel]="c.sellos.premio" (ngModelChange)="cambiarSellos({ premio: $event })" />
          </label>
          <p class="text-xs text-papel-400">Un sello por pedido entregado (lo marcas en "Pedidos"). Cambiar la meta no borra los sellos de nadie.</p>
        </fieldset>
      </section>
    }

    <section class="tarjeta mt-8 p-5 sm:p-6" aria-labelledby="titulo-admins">
      <h2 id="titulo-admins" class="font-display text-3xl font-extrabold uppercase leading-none text-papel-50">Quién entra al panel</h2>
      <p class="mt-1 text-sm text-papel-300">Cuentas de Google, o de correo y contraseña con el correo verificado. Ven clientes, pedidos y precios: agrega solo a personas de confianza.</p>
      <ul class="mt-4 divide-y divide-papel-100/10">
        <li class="flex items-center justify-between gap-3 py-3 text-sm">
          <span class="text-papel-50">{{ duena }}</span>
          <span class="etiqueta bg-papel-100/10 text-papel-200">Cuenta principal</span>
        </li>
        @for (a of admins(); track a) {
          <li class="flex items-center justify-between gap-3 py-3 text-sm">
            <span class="break-all text-papel-50">{{ a }}</span>
            <button type="button" class="boton-icono !h-10 !w-10" [attr.aria-label]="'Quitar a ' + a" [disabled]="a === correoPropio().toLowerCase()" (click)="quitar(a)">
              <app-icono nombre="borrar" class="h-4 w-4" />
            </button>
          </li>
        }
      </ul>
      <form class="mt-4 flex flex-wrap gap-2" (ngSubmit)="agregar()">
        <label class="min-w-0 flex-1 basis-64">
          <span class="sr-only">Correo de la persona</span>
          <input class="campo" type="email" name="correo" placeholder="correo@ejemplo.com" required [(ngModel)]="nuevo" />
        </label>
        <button type="submit" class="boton-linea" [disabled]="ocupado()"><app-icono nombre="mas" class="h-4 w-4" /> Agregar</button>
      </form>
      @if (error(); as e) {
        <p class="mt-3 rounded-2xl bg-primario-500/15 p-3.5 text-sm text-primario-100" role="alert">{{ e }}</p>
      }
    </section>
  `,
})
export class ClubAdminComponent {
  private readonly cartas = inject(CartaAdminService);
  /** Correo de quien está en el panel (no se puede quitar a sí mismo). */
  readonly correoPropio = input('');
  readonly club = computed(() => this.cartas.borrador()?.club ?? null);
  readonly admins = signal<string[]>([]);
  readonly ocupado = signal(false);
  readonly error = signal('');
  readonly duena = CLIENTE.adminEmail;
  nuevo = '';

  constructor() {
    void this.cargarAdmins();
  }

  cambiar(cambios: Partial<AjustesClub>) {
    this.cartas.cambiar((carta) => ({ ...carta, club: { ...carta.club, ...cambios } }));
  }

  cambiarDescuento(cambios: Partial<AjustesClub['descuento']>) {
    this.cartas.cambiar((carta) => ({ ...carta, club: { ...carta.club, descuento: { ...carta.club.descuento, ...cambios } } }));
  }

  cambiarSellos(cambios: Partial<AjustesClub['sellos']>) {
    this.cartas.cambiar((carta) => ({ ...carta, club: { ...carta.club, sellos: { ...carta.club.sellos, ...cambios } } }));
  }

  numero(evento: Event, minimo: number, maximo: number): number {
    const valor = Math.round((evento.target as HTMLInputElement).valueAsNumber || 0);
    return Math.min(maximo, Math.max(minimo, valor));
  }

  async agregar() {
    const correo = this.nuevo.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return this.error.set('Escribe un correo válido.');
    await this.intentar(async () => {
      await setDoc(doc(db(), 'admins', correo), { agregadoEn: serverTimestamp() });
      this.nuevo = '';
      await this.cargarAdmins();
    });
  }

  async quitar(correo: string) {
    if (!confirm(`¿Quitar a ${correo} del panel?`)) return;
    await this.intentar(async () => {
      await deleteDoc(doc(db(), 'admins', correo));
      this.admins.update((lista) => lista.filter((a) => a !== correo));
    });
  }

  private async cargarAdmins() {
    try {
      const resultado = await getDocs(collection(db(), 'admins'));
      this.admins.set(resultado.docs.map((d) => d.id).filter((c) => c !== CLIENTE.adminEmail.toLowerCase()).sort());
    } catch (e) {
      this.error.set(mensajeDeError(e));
    }
  }

  private async intentar(accion: () => Promise<unknown>) {
    this.ocupado.set(true);
    this.error.set('');
    try {
      await accion();
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.ocupado.set(false);
    }
  }
}
