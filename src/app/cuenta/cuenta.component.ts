import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import type { User } from 'firebase/auth';
import { CartaService } from '../carta/carta.service';
import { celularValido, premiosDisponibles, sellosEnTarjeta } from '../club/club';
import type { Cliente, EstadoPedido } from '../club/modelo';
import { IconoComponent } from '../compartido/icono.component';
import { StickerComponent } from '../compartido/sticker.component';
import { CLIENTE } from '../config/cliente';
import { firebaseListo } from '../firebase/config';
import { mensajeDeError } from '../firebase/errores';
import { usuarioActual } from '../firebase/sdk';
import { formatoPrecio } from '../menu/precio';
import { formatoCelular } from '../negocio/contacto';
import { PaginaComponent } from '../paginas/pagina.component';
import {
  type DatosCliente,
  type PedidoConId,
  actualizar,
  copiaDeMisDatos,
  crearConCorreo,
  eliminarCuenta,
  entrarConCorreo,
  entrarConGoogle,
  esAdmin,
  leerCliente,
  misPedidos,
  noRegistrarme,
  recordarClave,
  reenviarVerificacion,
  registrar,
  salir,
} from './cuenta';

type Estado = 'cargando' | 'sin-firebase' | 'fuera' | 'registro' | 'dentro';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ESTADOS: Record<EstadoPedido, string> = { enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado' };

/** Formulario de datos: lo mismo al registrarse y al cambiarlos. */
interface Formulario {
  nombre: string;
  celular: string;
  dia: string;
  mes: string;
  direccion: string;
  barrio: string;
  datos: boolean;
  promociones: boolean;
}

/**
 * Mi cuenta (/cuenta): entrar o registrarse en el Club (opcional), y para quien ya es cliente sus sellos, sus pedidos,
 * sus datos y sus derechos (corregir, descargar una copia y eliminar la cuenta).
 */
@Component({
  selector: 'app-cuenta',
  imports: [PaginaComponent, IconoComponent, StickerComponent, FormsModule, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pagina actual="cuenta">
      <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14">
        @switch (estado()) {
          @case ('cargando') {
            <p class="py-20 text-center text-papel-300" role="status">Cargando…</p>
          }

          @case ('sin-firebase') {
            <div class="tarjeta flex flex-col items-center p-8 text-center">
              <app-sticker nombre="mascota-pensando" class="h-28" />
              <h1 class="mt-4 font-display text-4xl font-extrabold uppercase leading-none text-papel-50">Muy pronto</h1>
              <p class="mt-2 max-w-sm text-papel-300">Las cuentas del {{ club().nombre }} todavía no están abiertas. Mientras tanto puedes pedir por WhatsApp como siempre.</p>
              <a href="/#menu" class="boton-fuego mt-6">Ver el menú</a>
            </div>
          }

          @case ('fuera') {
            <header>
              <p class="rotulo" data-num="★">{{ club().nombre }}</p>
              <h1 class="mt-4 font-display text-5xl font-extrabold uppercase leading-[0.9] text-papel-50 sm:text-6xl">Entra o regístrate</h1>
              <p class="mt-4 max-w-xl text-papel-200">
                @if (beneficios().length) {
                  Con tu cuenta tienes {{ beneficios().join(' y ') }}.
                }
                Registrarte es <strong class="text-papel-50">opcional</strong>: puedes pedir por WhatsApp sin cuenta.
              </p>
            </header>

            <div class="tarjeta mt-8 p-5 sm:p-7">
              <button type="button" class="boton-linea w-full" [disabled]="ocupado()" (click)="google()">
                <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.3 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12Z"/></svg>
                Continuar con Google
              </button>
              @if (enOtraApp) {
                <p class="mt-3 text-sm text-papel-300">Si abriste esta página desde Instagram o TikTok, Google puede no dejarte entrar: usa tu correo o abre la página en Chrome o Safari.</p>
              }

              <p class="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-papel-400">
                <span class="h-px flex-1 bg-papel-100/10"></span> o con tu correo <span class="h-px flex-1 bg-papel-100/10"></span>
              </p>

              <form class="grid gap-4" (ngSubmit)="conCorreo()">
                <label>
                  <span class="campo-rotulo">Correo</span>
                  <input class="campo" type="email" name="correo" autocomplete="email" required [(ngModel)]="correo" />
                </label>
                <label>
                  <span class="campo-rotulo">Contraseña</span>
                  <input class="campo" type="password" name="clave" required minlength="8"
                         [attr.autocomplete]="creando() ? 'new-password' : 'current-password'" [(ngModel)]="clave" />
                  @if (creando()) {
                    <span class="mt-1.5 block text-xs text-papel-400">Mínimo 8 caracteres.</span>
                  }
                </label>
                <button type="submit" class="boton-fuego w-full" [disabled]="ocupado()">{{ creando() ? 'Crear mi cuenta' : 'Entrar' }}</button>
              </form>
              <div class="mt-3 flex flex-wrap justify-between gap-x-4 text-sm">
                <button type="button" class="enlace-toque font-bold text-papel-200 underline underline-offset-4 hover:text-papel-50" (click)="creando.set(!creando()); error.set('')">
                  {{ creando() ? 'Ya tengo cuenta' : 'Crear una cuenta con mi correo' }}
                </button>
                @if (!creando()) {
                  <button type="button" class="enlace-toque text-papel-300 underline underline-offset-4 hover:text-papel-50" (click)="olvide()">Olvidé mi contraseña</button>
                }
              </div>
              <ng-container *ngTemplateOutlet="avisos" />
            </div>

            <p class="mt-6 text-center">
              <a [href]="volverA()" class="enlace-toque font-bold text-papel-200 underline underline-offset-4 hover:text-papel-50">Seguir sin registrarme</a>
            </p>
          }

          @case ('registro') {
            <header>
              <p class="rotulo" data-num="★">{{ club().nombre }}</p>
              <h1 class="mt-4 font-display text-5xl font-extrabold uppercase leading-[0.9] text-papel-50">Completa tu registro</h1>
              <p class="mt-3 text-papel-300">Entraste como {{ usuario()?.email }}. Faltan unos datos para tus pedidos y beneficios.</p>
            </header>
            <form class="tarjeta mt-8 grid gap-5 p-5 sm:p-7" (ngSubmit)="crearPerfil()">
              <ng-container *ngTemplateOutlet="campos" />

              <div class="rounded-2xl border border-papel-100/10 bg-fondo-950/40 p-4 text-sm leading-relaxed text-papel-300">
                <p>
                  <strong class="text-papel-100">Aviso de privacidad.</strong> {{ responsable }} trata tus datos para administrar tu cuenta
                  del {{ club().nombre }}, tus pedidos, domicilios, descuentos y sellos, y para atender tus solicitudes. Puedes conocer,
                  corregir y borrar tus datos, y revocar esta autorización, desde "Mi cuenta" o escribiéndonos. Detalles en la
                  <a href="/politica-de-datos" target="_blank" class="font-semibold text-papel-50 underline underline-offset-4">política de datos</a>.
                </p>
              </div>

              <label class="flex cursor-pointer items-start gap-3 text-sm leading-snug text-papel-100">
                <input type="checkbox" name="autorizo" class="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--destello-400))]" required [(ngModel)]="form.datos" />
                <span>
                  Autorizo a {{ responsable }} a tratar mis datos personales según la
                  <a href="/politica-de-datos" target="_blank" class="font-semibold underline underline-offset-4">política de datos</a>
                  y acepto los <a href="/terminos#club" target="_blank" class="font-semibold underline underline-offset-4">términos del {{ club().nombre }}</a>.
                  Soy mayor de edad o tengo autorización de mi representante legal. <span class="text-papel-400">(Obligatorio)</span>
                </span>
              </label>
              <label class="flex cursor-pointer items-start gap-3 text-sm leading-snug text-papel-100">
                <input type="checkbox" name="promociones" class="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--destello-400))]" [(ngModel)]="form.promociones" />
                <span>Quiero recibir promociones y novedades por WhatsApp o correo. <span class="text-papel-400">(Opcional: lo puedes cambiar cuando quieras)</span></span>
              </label>

              <ng-container *ngTemplateOutlet="avisos" />
              <div class="flex flex-col gap-3 sm:flex-row-reverse sm:items-center">
                <button type="submit" class="boton-fuego" [disabled]="ocupado()">Crear mi cuenta del Club</button>
                <button type="button" class="enlace-toque justify-center text-sm font-bold text-papel-300 underline underline-offset-4 hover:text-papel-50 sm:mr-auto" (click)="cancelarRegistro()">
                  No quiero registrarme
                </button>
              </div>
            </form>
          }

          @case ('dentro') {
            @if (cliente(); as c) {
              <header class="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p class="rotulo" data-num="★">{{ club().nombre }}</p>
                  <h1 class="mt-4 font-display text-5xl font-extrabold uppercase leading-[0.9] text-papel-50">Hola, {{ primerNombre() }}</h1>
                </div>
                <div class="flex flex-wrap gap-2">
                  @if (volverAlPedido) {
                    <a href="/?pedido" class="boton-fuego">Volver a mi pedido</a>
                  } @else {
                    <a href="/#menu" class="boton-fuego">Pedir ahora</a>
                  }
                  @if (admin()) {
                    <a href="/admin" class="boton-linea"><app-icono nombre="ajustes" class="h-5 w-5 text-destello-400" /> Panel</a>
                  }
                </div>
              </header>

              @if (sinVerificar()) {
                <p class="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-destello-400/40 bg-destello-400/10 p-4 text-sm text-papel-100">
                  <app-icono nombre="correo" class="h-5 w-5 text-destello-300" />
                  <span class="flex-1">Te enviamos un correo para verificar tu cuenta. Revisa también la carpeta de spam.</span>
                  <button type="button" class="font-bold underline underline-offset-4" (click)="reenviar()">Reenviar</button>
                </p>
              }

              @if (club().activo && club().sellos.activo) {
                <section class="tarjeta mt-8 p-5 sm:p-7" aria-labelledby="titulo-sellos">
                  <h2 id="titulo-sellos" class="font-display text-3xl font-extrabold uppercase leading-none text-papel-50">Tu tarjeta de sellos</h2>
                  <p class="mt-2 text-sm text-papel-300">
                    Un sello por cada pedido hecho desde tu cuenta que te entregamos. Con {{ club().sellos.meta }} sellos: {{ premio() }}.
                  </p>
                  <ol class="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-8" [attr.aria-label]="enTarjeta() + ' de ' + club().sellos.meta + ' sellos'">
                    @for (n of casillas(); track n) {
                      <li class="grid aspect-square place-items-center rounded-full border-2 border-dashed"
                          [class]="n <= enTarjeta() ? 'border-destello-400 bg-destello-400/15' : 'border-papel-100/15'">
                        @if (n <= enTarjeta()) {
                          <app-icono nombre="llama" class="h-2/3 w-2/3 text-destello-400" />
                        } @else {
                          <span class="text-sm font-bold text-papel-400">{{ n }}</span>
                        }
                      </li>
                    }
                  </ol>
                  @if (premios() > 0) {
                    <p class="mt-5 flex items-center gap-3 rounded-2xl bg-destello-400 p-4 font-bold text-sobre-destello">
                      <app-icono nombre="regalo" class="h-6 w-6" />
                      {{ premios() === 1 ? 'Tienes un premio' : 'Tienes ' + premios() + ' premios' }}: márcalo en tu próximo pedido.
                    </p>
                  }
                </section>
              }

              @if (descuentoPendiente()) {
                <p class="mt-5 flex items-center gap-3 rounded-2xl border border-fresco-400/30 bg-fresco-500/10 p-4 text-sm text-papel-100">
                  <app-icono nombre="regalo" class="h-5 w-5 text-fresco-300" />
                  {{ descuentoPendiente() }}
                </p>
              }

              <section class="mt-10" aria-labelledby="titulo-pedidos">
                <h2 id="titulo-pedidos" class="font-display text-3xl font-extrabold uppercase leading-none text-papel-50">Mis pedidos</h2>
                @if (pedidos().length) {
                  <ul class="mt-4 divide-y divide-papel-100/10 rounded-2xl border border-papel-100/10">
                    @for (p of pedidos(); track p.id) {
                      <li class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 p-4 text-sm">
                        <div class="min-w-0">
                          <p class="font-semibold text-papel-50">{{ resumen(p) }}</p>
                          <p class="text-papel-400">{{ fecha(p) }}</p>
                        </div>
                        <div class="flex items-center gap-3">
                          <span class="cifras font-bold text-destello-300">{{ precio(p.total) }}</span>
                          <span class="etiqueta" [class]="p.estado === 'entregado' ? 'bg-fresco-500/20 text-fresco-200' : p.estado === 'cancelado' ? 'bg-primario-500/20 text-primario-200' : 'bg-papel-100/10 text-papel-200'">{{ estados[p.estado] }}</span>
                        </div>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="mt-3 text-papel-300">Aún no hay pedidos hechos desde tu cuenta. Cuando envíes uno por WhatsApp con tu sesión abierta, aparece aquí.</p>
                }
              </section>

              <section class="mt-10" aria-labelledby="titulo-datos">
                <h2 id="titulo-datos" class="font-display text-3xl font-extrabold uppercase leading-none text-papel-50">Mis datos</h2>
                <form class="tarjeta mt-4 grid gap-5 p-5 sm:p-7" (ngSubmit)="guardarDatos()">
                  <ng-container *ngTemplateOutlet="campos" />
                  <label class="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-fondo-950/40 p-4 text-sm text-papel-100">
                    <span>Recibir promociones y novedades por WhatsApp o correo</span>
                    <input type="checkbox" name="promos" class="peer sr-only" [(ngModel)]="form.promociones" />
                    <span class="interruptor"></span>
                  </label>
                  <ng-container *ngTemplateOutlet="avisos" />
                  <button type="submit" class="boton-fuego justify-self-start" [disabled]="ocupado()">Guardar mis datos</button>
                </form>
                <p class="mt-3 text-xs text-papel-400">
                  Autorizaste el tratamiento de tus datos el {{ fechaDe(c.autorizaciones.datos.fecha) }} (política del {{ c.autorizaciones.datos.version }}).
                </p>
              </section>

              <section class="mt-10" aria-labelledby="titulo-privacidad">
                <h2 id="titulo-privacidad" class="font-display text-3xl font-extrabold uppercase leading-none text-papel-50">Tu privacidad</h2>
                <div class="mt-4 flex flex-wrap gap-3">
                  <button type="button" class="boton-linea" [disabled]="ocupado()" (click)="descargar()">
                    <app-icono nombre="bajar" class="h-5 w-5 text-destello-400" /> Descargar mis datos
                  </button>
                  <button type="button" class="boton-linea" (click)="cerrarSesion()">
                    <app-icono nombre="salir" class="h-5 w-5 text-destello-400" /> Cerrar sesión
                  </button>
                  <button type="button" class="boton-linea !border-primario-400/40 hover:!border-primario-400" [disabled]="ocupado()" (click)="eliminar()">
                    <app-icono nombre="borrar" class="h-5 w-5 text-primario-300" /> Eliminar mi cuenta
                  </button>
                </div>
              </section>
            }
          }
        }
      </div>
    </app-pagina>

    <!-- Campos del perfil (registro y "Mis datos") -->
    <ng-template #campos>
      <div class="grid gap-5 sm:grid-cols-2">
        <label>
          <span class="campo-rotulo">Nombre</span>
          <input class="campo" name="nombre" autocomplete="name" required maxlength="60" [(ngModel)]="form.nombre" />
        </label>
        <label>
          <span class="campo-rotulo">Celular</span>
          <input class="campo" name="celular" type="tel" inputmode="tel" autocomplete="tel-national" required placeholder="300 123 4567" [(ngModel)]="form.celular" />
        </label>
        <label class="sm:col-span-2">
          <span class="campo-rotulo">Correo</span>
          <input class="campo" name="correo-cuenta" [value]="usuario()?.email ?? ''" disabled />
        </label>
        <fieldset class="sm:col-span-2">
          <legend class="campo-rotulo">Cumpleaños <span class="normal-case tracking-normal text-papel-400">(opcional, para un detalle ese día)</span></legend>
          <div class="grid grid-cols-2 gap-3">
            <select class="campo" name="dia" aria-label="Día" [(ngModel)]="form.dia">
              <option value="">Día</option>
              @for (d of dias; track d) {
                <option [value]="d">{{ d }}</option>
              }
            </select>
            <select class="campo" name="mes" aria-label="Mes" [(ngModel)]="form.mes">
              <option value="">Mes</option>
              @for (m of meses; track m; let i = $index) {
                <option [value]="i + 1">{{ m }}</option>
              }
            </select>
          </div>
        </fieldset>
        <label>
          <span class="campo-rotulo">Dirección <span class="normal-case tracking-normal text-papel-400">(opcional)</span></span>
          <input class="campo" name="direccion" autocomplete="street-address" maxlength="120" placeholder="Para tus domicilios" [(ngModel)]="form.direccion" />
        </label>
        <label>
          <span class="campo-rotulo">Barrio <span class="normal-case tracking-normal text-papel-400">(opcional)</span></span>
          <input class="campo" name="barrio" maxlength="60" [(ngModel)]="form.barrio" />
        </label>
      </div>
    </ng-template>

    <ng-template #avisos>
      @if (error(); as e) {
        <p class="mt-4 rounded-2xl bg-primario-500/15 p-3.5 text-sm text-primario-100" role="alert">{{ e }}</p>
      }
      @if (aviso(); as a) {
        <p class="mt-4 rounded-2xl bg-fresco-500/15 p-3.5 text-sm text-fresco-100" role="status">{{ a }}</p>
      }
    </ng-template>
  `,
})
export class CuentaComponent {
  private readonly cartas = inject(CartaService);
  readonly club = computed(() => this.cartas.carta().club);
  readonly estado = signal<Estado>(firebaseListo ? 'cargando' : 'sin-firebase');
  readonly usuario = signal<User | null>(null);
  readonly cliente = signal<Cliente | null>(null);
  readonly pedidos = signal<PedidoConId[]>([]);
  readonly admin = signal(false);
  readonly ocupado = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');
  readonly creando = signal(false);

  readonly responsable = CLIENTE.legal.razonSocial ?? CLIENTE.nombre;
  readonly dias = Array.from({ length: 31 }, (_, i) => i + 1);
  readonly meses = MESES;
  readonly estados = ESTADOS;
  readonly precio = formatoPrecio;
  /** Llegó desde "Tu pedido" (/cuenta?volver=pedido): al terminar vuelve a abrirlo. */
  readonly volverAlPedido = new URLSearchParams(location.search).get('volver') === 'pedido';
  /** El navegador de Instagram, Facebook o TikTok: ahí Google no deja entrar. */
  readonly enOtraApp = /Instagram|FBAN|FBAV|TikTok|musical_ly|Bytedance/i.test(navigator.userAgent);

  correo = '';
  clave = '';
  form: Formulario = vacio();

  readonly beneficios = computed(() => {
    const { activo, descuento, sellos } = this.club();
    if (!activo) return [];
    return [
      descuento.activo && descuento.porcentaje > 0 ? `${descuento.porcentaje} % de descuento ${descuento.soloPrimerPedido ? 'en tu primer pedido' : 'en tus pedidos'}` : '',
      sellos.activo ? `un sello por pedido y, con ${sellos.meta}, ${this.premio()}` : '',
    ].filter(Boolean);
  });
  /** "una hamburguesa La Clásica sola": el premio con minúscula inicial, para la frase. */
  readonly premio = computed(() => minusculaInicial(this.club().sellos.premio));
  readonly primerNombre = computed(() => this.cliente()?.nombre.split(' ')[0] ?? '');
  readonly casillas = computed(() => Array.from({ length: this.club().sellos.meta }, (_, i) => i + 1));
  readonly enTarjeta = computed(() => sellosEnTarjeta(this.cliente()?.sellos ?? 0, this.club().sellos.meta));
  readonly premios = computed(() => premiosDisponibles(this.cliente()?.sellos ?? 0, this.club().sellos.meta));
  readonly sinVerificar = computed(() => {
    const u = this.usuario();
    return !!u && !u.emailVerified && u.providerData.some((p) => p.providerId === 'password');
  });
  readonly descuentoPendiente = computed(() => {
    const { activo, nombre, descuento } = this.club();
    if (!activo || !descuento.activo || descuento.porcentaje <= 0) return '';
    const sinPedidos = !this.pedidos().some((p) => p.estado !== 'cancelado');
    if (descuento.soloPrimerPedido && !sinPedidos) return '';
    const minimo = descuento.minimo > 0 ? ` desde ${formatoPrecio(descuento.minimo)}` : '';
    return descuento.soloPrimerPedido
      ? `Tu primer pedido desde la cuenta tiene ${descuento.porcentaje} % de descuento${minimo}. Se aplica solo en "Tu pedido".`
      : `Por ser del ${nombre}, tus pedidos tienen ${descuento.porcentaje} % de descuento${minimo}.`;
  });

  constructor() {
    inject(Title).setTitle(`Mi cuenta · ${CLIENTE.nombre}`);
    if (!firebaseListo) return;
    void this.cartas.actualizar();
    void this.revisar();
  }

  volverA(): string {
    return this.volverAlPedido ? '/?pedido' : '/#menu';
  }

  async google() {
    await this.intentar(async () => this.alEntrar(await entrarConGoogle()));
  }

  async conCorreo() {
    if (this.creando() && this.clave.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    await this.intentar(async () => this.alEntrar(await (this.creando() ? crearConCorreo(this.correo, this.clave) : entrarConCorreo(this.correo, this.clave))));
    this.clave = '';
  }

  async olvide() {
    if (!this.correo.includes('@')) {
      this.error.set('Escribe tu correo arriba y vuelve a tocar "Olvidé mi contraseña".');
      return;
    }
    await this.intentar(async () => {
      await recordarClave(this.correo);
      this.aviso.set('Si hay una cuenta con ese correo, te llegará un enlace para crear una contraseña nueva.');
    });
  }

  async crearPerfil() {
    const usuario = this.usuario();
    const datos = this.datosDelFormulario();
    if (!usuario || !datos) return;
    if (!this.form.datos) {
      this.error.set('Para crear tu cuenta necesitamos tu autorización para tratar tus datos.');
      return;
    }
    await this.intentar(async () => {
      await registrar(usuario, datos);
      await this.cargarCliente(usuario);
      this.aviso.set('¡Listo! Ya eres parte del Club.');
    });
  }

  async guardarDatos() {
    const usuario = this.usuario();
    const actual = this.cliente();
    const datos = this.datosDelFormulario();
    if (!usuario || !actual || !datos) return;
    await this.intentar(async () => {
      await actualizar(usuario.uid, actual, datos);
      await this.cargarCliente(usuario);
      this.aviso.set('Guardamos tus datos.');
    });
  }

  async cancelarRegistro() {
    const usuario = this.usuario();
    if (!usuario) return;
    await this.intentar(async () => {
      await noRegistrarme(usuario);
      location.href = this.volverA();
    });
  }

  async reenviar() {
    const usuario = this.usuario();
    if (!usuario) return;
    await this.intentar(async () => {
      await reenviarVerificacion(usuario);
      this.aviso.set('Te enviamos el correo otra vez.');
    });
  }

  async descargar() {
    const usuario = this.usuario();
    if (!usuario) return;
    await this.intentar(async () => {
      const archivo = await copiaDeMisDatos(usuario);
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(archivo);
      enlace.download = `mis-datos-${CLIENTE.id}.json`;
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
    });
  }

  async cerrarSesion() {
    await salir();
    location.href = '/';
  }

  async eliminar() {
    const usuario = this.usuario();
    if (!usuario) return;
    const seguro = confirm('¿Eliminar tu cuenta del Club? Se borran tus datos, tus pedidos y tus sellos. No se puede deshacer.');
    if (!seguro) return;
    await this.intentar(async () => {
      await eliminarCuenta(usuario);
      location.href = '/';
    });
  }

  resumen(p: PedidoConId): string {
    const unidades = p.lineas.reduce((s, l) => s + l.cantidad, 0);
    const primero = p.lineas[0]?.nombre ?? '';
    return unidades > 1 ? `${primero} y ${unidades - 1} más` : primero;
  }

  fecha(p: PedidoConId): string {
    return this.fechaDe(p.creadoEn);
  }

  fechaDe(valor: { toDate(): Date } | undefined): string {
    return valor?.toDate ? valor.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  }

  /** Mira si hay sesión y qué pantalla toca. */
  private async revisar() {
    try {
      const usuario = await usuarioActual();
      if (usuario) await this.alEntrar(usuario);
      else this.estado.set('fuera');
    } catch (e) {
      this.error.set(mensajeDeError(e));
      this.estado.set('fuera');
    }
  }

  private async alEntrar(usuario: User) {
    this.usuario.set(usuario);
    this.correo = '';
    void esAdmin(usuario).then((si) => this.admin.set(si));
    await this.cargarCliente(usuario);
  }

  private async cargarCliente(usuario: User) {
    const cliente = await leerCliente(usuario.uid);
    this.cliente.set(cliente);
    this.form = cliente ? formularioDe(cliente) : { ...vacio(), nombre: usuario.displayName ?? '' };
    if (cliente) this.pedidos.set(await misPedidos(usuario.uid).catch(() => []));
    this.estado.set(cliente ? 'dentro' : 'registro');
  }

  /** Los datos del formulario listos para guardar, o null (y el error) si algo no está bien. */
  private datosDelFormulario(): DatosCliente | null {
    this.error.set('');
    const f = this.form;
    const celular = celularValido(f.celular);
    if (f.nombre.trim().length < 2) return this.falla('Escribe tu nombre.');
    if (!celular) return this.falla('Escribe un celular de 10 dígitos que empiece por 3.');
    if (!!f.dia !== !!f.mes) return this.falla('Para el cumpleaños elige el día y el mes (o deja los dos vacíos).');
    return {
      nombre: f.nombre,
      celular,
      cumpleanos: f.dia && f.mes ? `${f.mes.padStart(2, '0')}-${f.dia.padStart(2, '0')}` : undefined,
      direccion: f.direccion,
      barrio: f.barrio,
      promociones: f.promociones,
    };
  }

  private falla(mensaje: string): null {
    this.error.set(mensaje);
    return null;
  }

  /** Corre una acción mostrando "ocupado" y el error en español si falla. */
  private async intentar(accion: () => Promise<unknown>) {
    this.ocupado.set(true);
    this.error.set('');
    this.aviso.set('');
    try {
      await accion();
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.ocupado.set(false);
    }
  }
}

function minusculaInicial(texto: string): string {
  const t = texto.trim();
  return t ? t.charAt(0).toLowerCase() + t.slice(1) : 'un premio';
}

function vacio(): Formulario {
  return { nombre: '', celular: '', dia: '', mes: '', direccion: '', barrio: '', datos: false, promociones: false };
}

function formularioDe(c: Cliente): Formulario {
  const [mes, dia] = c.cumpleanos?.split('-') ?? ['', ''];
  return {
    nombre: c.nombre,
    celular: formatoCelular(c.celular),
    dia: dia ? String(Number(dia)) : '',
    mes: mes ? String(Number(mes)) : '',
    direccion: c.direccion ?? '',
    barrio: c.barrio ?? '',
    datos: true,
    promociones: c.autorizaciones.promociones.aceptada,
  };
}
