import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import type { User } from 'firebase/auth';
import { IconoComponent, type NombreIcono } from '../compartido/icono.component';
import { StickerComponent } from '../compartido/sticker.component';
import { CLIENTE } from '../config/cliente';
import { entrarConCorreo, entrarConGoogle, esAdmin, salir } from '../cuenta/cuenta';
import { firebaseListo } from '../firebase/config';
import { mensajeDeError } from '../firebase/errores';
import { usuarioActual } from '../firebase/sdk';
import { LogotipoComponent } from '../marca/logotipo.component';
import { MascotaComponent } from '../marca/mascota.component';
import { CartaAdminService } from './carta-admin.service';
import { ClientesAdminComponent } from './clientes-admin.component';
import { ClubAdminComponent } from './club-admin.component';
import { CuponesAdminComponent } from './cupones-admin.component';
import { MenuAdminComponent } from './menu-admin.component';
import { PedidosAdminComponent } from './pedidos-admin.component';
import { PromosAdminComponent } from './promos-admin.component';

type Pestana = 'pedidos' | 'clientes' | 'menu' | 'promos' | 'cupones' | 'club';
type Estado = 'cargando' | 'sin-firebase' | 'fuera' | 'sin-permiso' | 'dentro';

const PESTANAS: { id: Pestana; texto: string; icono: NombreIcono }[] = [
  { id: 'pedidos', texto: 'Pedidos', icono: 'bolsa' },
  { id: 'clientes', texto: 'Clientes', icono: 'usuarios' },
  { id: 'menu', texto: 'Menú y precios', icono: 'carta' },
  { id: 'promos', texto: 'Promos y banners', icono: 'destello' },
  { id: 'cupones', texto: 'Cupones', icono: 'cupon' },
  { id: 'club', texto: 'Club y ajustes', icono: 'ajustes' },
];

/**
 * Panel de administración (/admin). Entra la cuenta `adminEmail` de la config o las que estén en `admins` (con el
 * correo verificado). Lo que de verdad protege los datos son las reglas de Firestore y Storage: esta pantalla solo
 * decide qué mostrar.
 */
@Component({
  selector: 'app-admin',
  imports: [
    FormsModule,
    IconoComponent,
    StickerComponent,
    LogotipoComponent,
    MascotaComponent,
    PedidosAdminComponent,
    ClientesAdminComponent,
    MenuAdminComponent,
    PromosAdminComponent,
    CuponesAdminComponent,
    ClubAdminComponent,
  ],
  providers: [CartaAdminService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-dvh' },
  template: `
    <header class="sticky top-0 z-40 border-b border-papel-100/10 bg-fondo-950/95 backdrop-blur-xl">
      <div class="mx-auto flex h-barra max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="/" class="flex min-h-11 items-center gap-2.5" aria-label="Ver la página">
          <app-mascota class="h-10 w-9" />
          <app-logotipo forma="linea" [conBurgers]="false" class="hidden h-7 text-destello-400 xs:block" etiqueta="" />
          <span class="etiqueta bg-destello-400 text-sobre-destello">Panel</span>
        </a>
        @if (usuario(); as u) {
          <div class="flex min-w-0 items-center gap-2">
            <span class="hidden truncate text-sm text-papel-300 md:block">{{ u.email }}</span>
            <button type="button" class="boton-icono" aria-label="Cerrar sesión" title="Cerrar sesión" (click)="cerrarSesion()">
              <app-icono nombre="salir" class="h-5 w-5" />
            </button>
          </div>
        }
      </div>
      @if (estado() === 'dentro') {
        <nav class="scrollbar-oculta mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6" aria-label="Secciones del panel">
          @for (p of pestanas; track p.id) {
            <button type="button" class="chip" [attr.aria-pressed]="pestana() === p.id" (click)="ir(p.id)">
              <app-icono [nombre]="p.icono" class="h-4 w-4" />
              {{ p.texto }}
            </button>
          }
        </nav>
      }
    </header>

    <main class="mx-auto max-w-7xl px-4 pb-32 pt-6 sm:px-6">
      @switch (estado()) {
        @case ('cargando') {
          <p class="py-20 text-center text-papel-300" role="status">Cargando…</p>
        }
        @case ('sin-firebase') {
          <div class="tarjeta mx-auto max-w-lg p-8 text-center">
            <app-sticker nombre="mascota-pensando" class="mx-auto h-24" />
            <h1 class="mt-4 font-display text-4xl font-extrabold uppercase leading-none text-papel-50">Falta conectar Firebase</h1>
            <p class="mt-3 text-papel-300">
              El panel necesita la configuración web de Firebase en <code class="text-destello-300">src/app/config/clientes/{{ idCliente }}.ts</code>
              (<code>firebase.apiKey</code>, <code>appId</code> y <code>messagingSenderId</code>). Los pasos están en el README.
            </p>
          </div>
        }
        @case ('fuera') {
          <div class="tarjeta mx-auto max-w-md p-6 sm:p-8">
            <h1 class="font-display text-4xl font-extrabold uppercase leading-none text-papel-50">Entrar al panel</h1>
            <p class="mt-2 text-sm text-papel-300">Solo para el equipo de {{ nombre }}.</p>
            <button type="button" class="boton-linea mt-6 w-full" [disabled]="ocupado()" (click)="google()">Continuar con Google</button>
            <form class="mt-6 grid gap-4 border-t border-papel-100/10 pt-6" (ngSubmit)="conCorreo()">
              <label>
                <span class="campo-rotulo">Correo</span>
                <input class="campo" type="email" name="correo" autocomplete="username" required [(ngModel)]="correo" />
              </label>
              <label>
                <span class="campo-rotulo">Contraseña</span>
                <input class="campo" type="password" name="clave" autocomplete="current-password" required [(ngModel)]="clave" />
              </label>
              <button type="submit" class="boton-fuego" [disabled]="ocupado()">Entrar</button>
            </form>
            @if (error(); as e) {
              <p class="mt-4 rounded-2xl bg-primario-500/15 p-3.5 text-sm text-primario-100" role="alert">{{ e }}</p>
            }
          </div>
        }
        @case ('sin-permiso') {
          <div class="tarjeta mx-auto max-w-md p-8 text-center">
            <app-sticker nombre="mascota-dormida" class="mx-auto h-24" />
            <h1 class="mt-4 font-display text-4xl font-extrabold uppercase leading-none text-papel-50">Sin permiso</h1>
            <p class="mt-3 text-papel-300">
              La cuenta {{ usuario()?.email }} no es del equipo{{ usuario()?.emailVerified ? '' : ' o su correo no está verificado' }}.
              Pide a un administrador que la agregue en "Club y ajustes".
            </p>
            <button type="button" class="boton-linea mt-6" (click)="cerrarSesion()">Entrar con otra cuenta</button>
          </div>
        }
        @case ('dentro') {
          @if (cartas.nueva() && pestanaDeCarta()) {
            <div class="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-destello-400/40 bg-destello-400/10 p-4 text-sm text-papel-100">
              <app-icono nombre="alerta" class="h-6 w-6 text-destello-300" />
              <p class="min-w-0 flex-1">
                <strong class="text-papel-50">La carta todavía no está en Firestore.</strong> Ves la de los archivos del proyecto. Publícala una
                vez (tal cual o con tus cambios) y desde ahí todo se cambia aquí.
              </p>
            </div>
          }
          @switch (pestana()) {
            @case ('pedidos') { <app-pedidos-admin /> }
            @case ('clientes') { <app-clientes-admin /> }
            @case ('menu') { <app-menu-admin /> }
            @case ('promos') { <app-promos-admin /> }
            @case ('cupones') { <app-cupones-admin /> }
            @case ('club') { <app-club-admin [correoPropio]="usuario()?.email ?? ''" /> }
          }
        }
      }
    </main>

    @if (estado() === 'dentro' && cartas.sucia()) {
      <div class="fixed inset-x-0 bottom-0 z-50 border-t border-destello-400/40 bg-fondo-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <p class="min-w-0 flex-1 text-sm text-papel-100">
            <strong class="text-destello-300">Cambios sin publicar.</strong> La página no cambia hasta que los publiques.
          </p>
          @if (errorPublicar(); as e) {
            <p class="w-full text-sm text-primario-200 sm:w-auto" role="alert">{{ e }}</p>
          }
          @if (!cartas.nueva()) {
            <button type="button" class="boton-linea !min-h-11 !py-2 !text-sm" (click)="cartas.descartar()">Descartar</button>
          }
          <button type="button" class="boton-fuego !min-h-11 !py-2 !text-sm" [disabled]="cartas.guardando()" (click)="publicar()">
            {{ cartas.guardando() ? 'Publicando…' : 'Publicar cambios' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class AdminComponent {
  protected readonly cartas = inject(CartaAdminService);
  readonly estado = signal<Estado>(firebaseListo ? 'cargando' : 'sin-firebase');
  readonly usuario = signal<User | null>(null);
  readonly pestana = signal<Pestana>(pestanaDe(location.hash));
  readonly ocupado = signal(false);
  readonly error = signal('');
  readonly errorPublicar = signal('');
  readonly pestanas = PESTANAS;
  readonly nombre = CLIENTE.nombre;
  readonly idCliente = CLIENTE.id;
  /** Las pestañas que editan la carta (las demás leen otras colecciones). */
  readonly pestanaDeCarta = computed(() => ['menu', 'promos', 'club'].includes(this.pestana()));

  correo = '';
  clave = '';

  constructor() {
    inject(Title).setTitle(`Panel · ${CLIENTE.nombre}`);
    // Sin cambios sin publicar perdidos por cerrar la pestaña.
    addEventListener('beforeunload', (e) => {
      if (this.cartas.sucia()) e.preventDefault();
    });
    if (firebaseListo) void this.revisar();
  }

  ir(pestana: Pestana) {
    this.pestana.set(pestana);
    history.replaceState(history.state, '', `#${pestana}`);
  }

  async google() {
    await this.intentar(async () => this.alEntrar(await entrarConGoogle()));
  }

  async conCorreo() {
    await this.intentar(async () => this.alEntrar(await entrarConCorreo(this.correo, this.clave)));
    this.clave = '';
  }

  async publicar() {
    this.errorPublicar.set('');
    try {
      await this.cartas.publicar();
    } catch (e) {
      this.errorPublicar.set(mensajeDeError(e));
    }
  }

  async cerrarSesion() {
    if (this.cartas.sucia() && !confirm('Tienes cambios sin publicar. ¿Salir de todas formas?')) return;
    await salir();
    location.reload();
  }

  private async revisar() {
    const usuario = await usuarioActual().catch(() => null);
    if (usuario) await this.alEntrar(usuario);
    else this.estado.set('fuera');
  }

  private async alEntrar(usuario: User) {
    this.usuario.set(usuario);
    if (!(await esAdmin(usuario))) {
      this.estado.set('sin-permiso');
      return;
    }
    await this.cartas.cargar();
    this.estado.set('dentro');
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

function pestanaDe(hash: string): Pestana {
  const id = hash.slice(1);
  return PESTANAS.some((p) => p.id === id) ? (id as Pestana) : 'pedidos';
}
