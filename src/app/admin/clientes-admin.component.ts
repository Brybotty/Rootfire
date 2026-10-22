import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { collection, doc, getDocs, increment, limit, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { premiosDisponibles } from '../club/club';
import type { Cliente } from '../club/modelo';
import { IconoComponent } from '../compartido/icono.component';
import { RedSocialComponent } from '../compartido/red-social.component';
import { CLIENTE } from '../config/cliente';
import type { PedidoConId } from '../cuenta/cuenta';
import { mensajeDeError } from '../firebase/errores';
import { db } from '../firebase/sdk';
import { normalizar } from '../menu/filtros';
import { formatoPrecio } from '../menu/precio';
import { enlaceWhatsApp, formatoCelular } from '../negocio/contacto';
import { fechaColombia } from '../negocio/promocion';
import { CartaAdminService } from './carta-admin.service';

interface ClienteConId extends Cliente {
  uid: string;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * Clientes registrados en el Club: buscar, ver sus datos y autorizaciones, sus pedidos, ajustar sellos y exportar la
 * lista. Para mandar promociones, usa solo a quienes las aceptaron (columna "Promociones").
 */
@Component({
  selector: 'app-clientes-admin',
  imports: [IconoComponent, RedSocialComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl font-extrabold uppercase leading-none text-papel-50">Clientes</h1>
        <p class="mt-1 text-sm text-papel-300">
          {{ clientes().length }} registrados · {{ conPromociones() }} aceptan promociones
          @if (cumplenEsteMes().length) { · {{ cumplenEsteMes().length }} cumplen años en {{ mesActual }} }
        </p>
      </div>
      <div class="flex gap-2">
        <button type="button" class="boton-linea !min-h-11 !py-2 !text-sm" (click)="cargar()"><app-icono nombre="actualizar" class="h-4 w-4" /> Actualizar</button>
        <button type="button" class="boton-linea !min-h-11 !py-2 !text-sm" [disabled]="!clientes().length" (click)="exportar()"><app-icono nombre="bajar" class="h-4 w-4" /> Exportar CSV</button>
      </div>
    </div>

    <div class="mt-5 flex flex-wrap items-center gap-2">
      <label class="relative min-w-0 flex-1 basis-64">
        <span class="sr-only">Buscar cliente</span>
        <app-icono nombre="buscar" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-papel-400" />
        <input class="campo !pl-12" type="search" placeholder="Nombre, celular o correo" [value]="busqueda()" (input)="busqueda.set($any($event.target).value)" />
      </label>
      <button type="button" class="chip" [attr.aria-pressed]="soloCumple()" (click)="soloCumple.set(!soloCumple())">Cumplen en {{ mesActual }}</button>
      <button type="button" class="chip" [attr.aria-pressed]="soloPromos()" (click)="soloPromos.set(!soloPromos())">Aceptan promociones</button>
    </div>

    @if (error(); as e) {
      <p class="mt-4 rounded-2xl bg-primario-500/15 p-3.5 text-sm text-primario-100" role="alert">{{ e }}</p>
    }

    @if (cargando()) {
      <p class="py-12 text-center text-papel-300" role="status">Cargando clientes…</p>
    } @else if (!visibles().length) {
      <p class="py-12 text-center text-papel-300">{{ clientes().length ? 'Nadie coincide con la búsqueda.' : 'Todavía no hay clientes registrados.' }}</p>
    } @else {
      <ul class="mt-5 divide-y divide-papel-100/10 overflow-hidden rounded-[1.6rem] border border-papel-100/10 bg-fondo-900/60">
        @for (c of visibles(); track c.uid) {
          <li>
            <button type="button" class="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-4 text-left transition hover:bg-white/[0.03]" [attr.aria-expanded]="abierto() === c.uid" (click)="abrir(c)">
              <span class="min-w-0 flex-1 basis-48">
                <span class="block truncate font-bold text-papel-50">{{ c.nombre }}</span>
                <span class="block truncate text-sm text-papel-400">{{ celular(c) }} · {{ c.correo }}</span>
              </span>
              <span class="text-sm text-papel-300">{{ c.pedidosEntregados }} pedidos</span>
              @if (selloActivo()) {
                <span class="etiqueta bg-destello-400/15 text-destello-200">{{ c.sellos }} sellos</span>
              }
              @if (c.autorizaciones.promociones.aceptada) {
                <span class="etiqueta bg-fresco-500/20 text-fresco-200">Promos</span>
              }
              @if (cumpleEsteMes(c)) {
                <span class="etiqueta bg-primario-500/20 text-primario-200"><app-icono nombre="regalo" class="h-3 w-3" /> {{ cumple(c) }}</span>
              }
            </button>
            @if (abierto() === c.uid) {
              <div class="grid gap-5 border-t border-papel-100/10 bg-fondo-950/40 p-4 text-sm md:grid-cols-2">
                <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                  <dt class="text-papel-400">Celular</dt>
                  <dd><a [href]="whatsapp(c)" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 font-semibold text-fresco-300"><app-red-social red="whatsapp" class="h-4 w-4" /> {{ celular(c) }}</a></dd>
                  <dt class="text-papel-400">Correo</dt>
                  <dd class="break-all text-papel-100">{{ c.correo }}</dd>
                  <dt class="text-papel-400">Cumpleaños</dt>
                  <dd class="text-papel-100">{{ cumple(c) || '—' }}</dd>
                  <dt class="text-papel-400">Dirección</dt>
                  <dd class="text-papel-100">{{ direccion(c) }}</dd>
                  <dt class="text-papel-400">Registro</dt>
                  <dd class="text-papel-100">{{ fecha(c.creadoEn) }}</dd>
                  <dt class="text-papel-400">Datos</dt>
                  <dd class="text-papel-100">Autorizó el {{ fecha(c.autorizaciones.datos.fecha) }} (política {{ c.autorizaciones.datos.version }})</dd>
                  <dt class="text-papel-400">Promociones</dt>
                  <dd class="text-papel-100">{{ c.autorizaciones.promociones.aceptada ? 'Sí' : 'No' }}, desde el {{ fecha(c.autorizaciones.promociones.fecha) }}</dd>
                </dl>
                <div>
                  @if (selloActivo()) {
                    <p class="font-bold text-papel-50">Sellos: {{ c.sellos }} @if (premios(c)) {<span class="text-destello-300">({{ premios(c) }} premio{{ premios(c) > 1 ? 's' : '' }})</span>}</p>
                    <div class="mt-2 flex gap-2">
                      <button type="button" class="boton-linea !min-h-11 !px-4 !py-2 !text-sm" [disabled]="c.sellos <= 0" (click)="sumarSellos(c, -1)"><app-icono nombre="menos" class="h-4 w-4" /> Quitar uno</button>
                      <button type="button" class="boton-linea !min-h-11 !px-4 !py-2 !text-sm" (click)="sumarSellos(c, 1)"><app-icono nombre="mas" class="h-4 w-4" /> Sumar uno</button>
                    </div>
                  }
                  <p class="mt-4 font-bold text-papel-50">Últimos pedidos</p>
                  @if (pedidos().length) {
                    <ul class="mt-2 space-y-1">
                      @for (p of pedidos(); track p.id) {
                        <li class="flex justify-between gap-3 text-papel-200">
                          <span>{{ fecha(p.creadoEn) }} · {{ p.estado }}</span>
                          <span class="cifras">{{ precio(p.total) }}</span>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="mt-1 text-papel-400">Sin pedidos desde su cuenta.</p>
                  }
                </div>
              </div>
            }
          </li>
        }
      </ul>
    }
  `,
})
export class ClientesAdminComponent {
  private readonly cartas = inject(CartaAdminService);
  readonly clientes = signal<ClienteConId[]>([]);
  readonly pedidos = signal<PedidoConId[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly busqueda = signal('');
  readonly soloCumple = signal(false);
  readonly soloPromos = signal(false);
  readonly abierto = signal('');
  readonly precio = formatoPrecio;
  readonly mesActual = MESES[Number(fechaColombia().slice(5, 7)) - 1];
  readonly selloActivo = computed(() => this.cartas.borrador()?.club.sellos.activo ?? false);

  readonly conPromociones = computed(() => this.clientes().filter((c) => c.autorizaciones.promociones.aceptada).length);
  readonly cumplenEsteMes = computed(() => this.clientes().filter((c) => this.cumpleEsteMes(c)));
  readonly visibles = computed(() => {
    const texto = normalizar(this.busqueda().trim());
    const digitos = texto.replace(/\D/g, '');
    return this.clientes().filter(
      (c) =>
        (!this.soloCumple() || this.cumpleEsteMes(c)) &&
        (!this.soloPromos() || c.autorizaciones.promociones.aceptada) &&
        (!texto || normalizar(`${c.nombre} ${c.correo}`).includes(texto) || (digitos.length >= 3 && c.celular.includes(digitos))),
    );
  });

  constructor() {
    void this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    this.error.set('');
    try {
      const resultado = await getDocs(query(collection(db(), 'clientes'), orderBy('creadoEn', 'desc'), limit(2000)));
      this.clientes.set(resultado.docs.map((d) => ({ uid: d.id, ...(d.data() as Cliente) })));
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  async abrir(c: ClienteConId) {
    if (this.abierto() === c.uid) return this.abierto.set('');
    this.abierto.set(c.uid);
    this.pedidos.set([]);
    try {
      const resultado = await getDocs(query(collection(db(), 'pedidos'), where('uid', '==', c.uid), orderBy('creadoEn', 'desc'), limit(10)));
      if (this.abierto() === c.uid) this.pedidos.set(resultado.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PedidoConId, 'id'>) })));
    } catch (e) {
      this.error.set(mensajeDeError(e));
    }
  }

  async sumarSellos(c: ClienteConId, cuanto: number) {
    try {
      await updateDoc(doc(db(), 'clientes', c.uid), { sellos: increment(cuanto) });
      this.clientes.update((lista) => lista.map((x) => (x.uid === c.uid ? { ...x, sellos: Math.max(0, x.sellos + cuanto) } : x)));
    } catch (e) {
      this.error.set(mensajeDeError(e));
    }
  }

  /** CSV para Excel (separado por punto y coma, como lo abre Excel en español). */
  exportar() {
    const celda = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const filas = [
      ['Nombre', 'Celular', 'Correo', 'Cumpleaños (MM-DD)', 'Dirección', 'Barrio', 'Pedidos entregados', 'Sellos', 'Promociones', 'Registro'],
      ...this.visibles().map((c) => [
        c.nombre,
        c.celular,
        c.correo,
        c.cumpleanos ?? '',
        c.direccion ?? '',
        c.barrio ?? '',
        c.pedidosEntregados,
        c.sellos,
        c.autorizaciones.promociones.aceptada ? 'Sí' : 'No',
        this.fecha(c.creadoEn),
      ]),
    ];
    const archivo = new Blob(['﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = `clientes-${CLIENTE.id}-${fechaColombia()}.csv`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
  }

  premios(c: ClienteConId): number {
    return premiosDisponibles(c.sellos, this.cartas.borrador()?.club.sellos.meta ?? 0);
  }

  cumpleEsteMes(c: Cliente): boolean {
    return !!c.cumpleanos && c.cumpleanos.slice(0, 2) === fechaColombia().slice(5, 7);
  }

  cumple(c: Cliente): string {
    if (!c.cumpleanos) return '';
    const [mes, dia] = c.cumpleanos.split('-').map(Number);
    return `${dia} de ${MESES[mes - 1]}`;
  }

  direccion(c: Cliente): string {
    return [c.direccion, c.barrio].filter(Boolean).join(', ') || '—';
  }

  celular(c: Cliente): string {
    return formatoCelular(c.celular);
  }

  whatsapp(c: Cliente): string {
    return enlaceWhatsApp(c.celular, `Hola, ${c.nombre.split(' ')[0]}. Te escribimos de ${CLIENTE.nombreCorto}.`);
  }

  fecha(valor: { toDate(): Date } | undefined): string {
    return valor?.toDate ? valor.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  }
}
