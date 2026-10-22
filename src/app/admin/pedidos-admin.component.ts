import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { collection, deleteField, doc, increment, limit, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { cambioDeSellos } from '../club/club';
import type { EstadoPedido } from '../club/modelo';
import { IconoComponent } from '../compartido/icono.component';
import { RedSocialComponent } from '../compartido/red-social.component';
import { CLIENTE } from '../config/cliente';
import type { PedidoConId } from '../cuenta/cuenta';
import { mensajeDeError } from '../firebase/errores';
import { db } from '../firebase/sdk';
import { formatoPrecio } from '../menu/precio';
import { enlaceWhatsApp, formatoCelular } from '../negocio/contacto';
import { fechaColombia } from '../negocio/promocion';
import { CartaAdminService } from './carta-admin.service';

type Filtro = EstadoPedido | 'todos';

/**
 * Pedidos que los clientes del Club enviaron por WhatsApp con su cuenta (los de quien pide sin cuenta solo están en
 * el chat). Llegan en vivo. Al marcar uno "Entregado" se le suma el sello al cliente (y si canjeó el premio, se le
 * descuentan los sellos del premio); "Deshacer" lo devuelve.
 */
@Component({
  selector: 'app-pedidos-admin',
  imports: [IconoComponent, RedSocialComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="tarjeta p-4">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-papel-300">Por atender</p>
        <p class="cifras mt-1 font-display text-4xl font-extrabold text-destello-400">{{ porAtender() }}</p>
      </div>
      <div class="tarjeta p-4">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-papel-300">Pedidos de hoy</p>
        <p class="cifras mt-1 font-display text-4xl font-extrabold text-papel-50">{{ hoy().cantidad }}</p>
      </div>
      <div class="tarjeta p-4">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-papel-300">Entregado hoy</p>
        <p class="cifras mt-1 font-display text-4xl font-extrabold text-papel-50">{{ precio(hoy().vendido) }}</p>
      </div>
    </div>
    <p class="mt-3 text-sm text-papel-400">Aquí salen los pedidos de clientes con cuenta del Club. Los demás llegan solo por WhatsApp.</p>

    <div class="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtrar pedidos">
      @for (f of filtros; track f.id) {
        <button type="button" class="chip" [attr.aria-pressed]="filtro() === f.id" (click)="filtro.set(f.id)">{{ f.texto }}</button>
      }
    </div>

    @if (error(); as e) {
      <p class="mt-4 rounded-2xl bg-primario-500/15 p-3.5 text-sm text-primario-100" role="alert">{{ e }}</p>
    }

    @if (cargando()) {
      <p class="py-12 text-center text-papel-300" role="status">Cargando pedidos…</p>
    } @else if (!visibles().length) {
      <p class="py-12 text-center text-papel-300">No hay pedidos aquí.</p>
    } @else {
      <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        @for (p of visibles(); track p.id) {
          <article class="tarjeta flex flex-col p-4" [class.!border-destello-400]="p.estado === 'enviado'">
            <header class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="truncate font-bold text-papel-50">{{ p.cliente.nombre }}</h3>
                <p class="text-sm text-papel-400">{{ cuando(p) }}</p>
              </div>
              <span class="etiqueta" [class]="clase(p.estado)">{{ textoEstado[p.estado] }}</span>
            </header>
            <a [href]="whatsapp(p)" target="_blank" rel="noopener" class="enlace-toque text-sm font-semibold text-fresco-300 hover:text-fresco-200">
              <app-red-social red="whatsapp" class="h-4 w-4" /> {{ celular(p) }}
            </a>
            <ul class="mt-2 space-y-1 border-t border-papel-100/10 pt-3 text-sm">
              @for (l of p.lineas; track $index) {
                <li class="flex justify-between gap-3">
                  <span class="text-papel-100">{{ l.cantidad }} × {{ l.nombre }} @if (l.detalle) {<span class="text-papel-400">({{ l.detalle }})</span>}</span>
                  <span class="cifras shrink-0 text-papel-200">{{ precio(l.precio * l.cantidad) }}</span>
                </li>
              }
              @if (p.premio) {
                <li class="flex gap-2 font-semibold text-destello-300"><app-icono nombre="regalo" class="h-4 w-4" /> Premio: {{ p.premio }}</li>
              }
            </ul>
            <div class="mt-3 space-y-0.5 border-t border-papel-100/10 pt-3 text-sm">
              @if (p.descuento; as d) {
                <p class="flex justify-between text-fresco-300"><span>{{ d.concepto }}</span><span class="cifras">−{{ precio(d.valor) }}</span></p>
              }
              <p class="flex justify-between font-bold text-papel-50"><span>Total</span><span class="cifras text-destello-300">{{ precio(p.total) }}</span></p>
              <p class="text-papel-300">{{ p.entrega === 'domicilio' ? 'A domicilio' : 'Recoge en el local' }}@if (p.direccion) {: {{ p.direccion }}}</p>
              @if (p.nota) {
                <p class="text-papel-300">Nota: {{ p.nota }}</p>
              }
            </div>
            <div class="mt-auto flex flex-wrap gap-2 pt-4">
              @if (p.estado === 'enviado') {
                <button type="button" class="boton-fuego !min-h-11 flex-1 !px-4 !py-2 !text-sm" [disabled]="ocupado() === p.id" (click)="cambiar(p, 'entregado')">
                  <app-icono nombre="check" [grosor]="2.2" class="h-4 w-4" /> Entregado
                </button>
                <button type="button" class="boton-linea !min-h-11 !px-4 !py-2 !text-sm" [disabled]="ocupado() === p.id" (click)="cambiar(p, 'cancelado')">Cancelado</button>
              } @else {
                <button type="button" class="boton-linea !min-h-11 !px-4 !py-2 !text-sm" [disabled]="ocupado() === p.id" (click)="cambiar(p, 'enviado')">
                  <app-icono nombre="actualizar" class="h-4 w-4" /> Deshacer
                </button>
              }
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class PedidosAdminComponent {
  private readonly cartas = inject(CartaAdminService);
  readonly pedidos = signal<PedidoConId[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly ocupado = signal('');
  readonly filtro = signal<Filtro>('enviado');
  readonly precio = formatoPrecio;
  readonly filtros: { id: Filtro; texto: string }[] = [
    { id: 'enviado', texto: 'Por atender' },
    { id: 'entregado', texto: 'Entregados' },
    { id: 'cancelado', texto: 'Cancelados' },
    { id: 'todos', texto: 'Todos' },
  ];
  readonly textoEstado: Record<EstadoPedido, string> = { enviado: 'Por atender', entregado: 'Entregado', cancelado: 'Cancelado' };

  readonly visibles = computed(() => {
    const filtro = this.filtro();
    return filtro === 'todos' ? this.pedidos() : this.pedidos().filter((p) => p.estado === filtro);
  });
  readonly porAtender = computed(() => this.pedidos().filter((p) => p.estado === 'enviado').length);
  readonly hoy = computed(() => {
    const dia = fechaColombia();
    const deHoy = this.pedidos().filter((p) => p.creadoEn && fechaColombia(p.creadoEn.toDate()) === dia);
    return {
      cantidad: deHoy.filter((p) => p.estado !== 'cancelado').length,
      vendido: deHoy.filter((p) => p.estado === 'entregado').reduce((s, p) => s + p.total, 0),
    };
  });

  constructor() {
    const consulta = query(collection(db(), 'pedidos'), orderBy('creadoEn', 'desc'), limit(200));
    const dejar = onSnapshot(
      consulta,
      (resultado) => {
        this.pedidos.set(resultado.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PedidoConId, 'id'>) })));
        this.cargando.set(false);
      },
      (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    );
    inject(DestroyRef).onDestroy(dejar);
  }

  async cambiar(p: PedidoConId, a: EstadoPedido) {
    this.ocupado.set(p.id);
    this.error.set('');
    try {
      const meta = this.cartas.borrador()?.club.sellos.meta ?? 1;
      const cambio = cambioDeSellos(p.estado, a, !!p.premio, meta);
      const lote = writeBatch(db());
      lote.update(doc(db(), 'pedidos', p.id), { estado: a, cerradoEn: a === 'enviado' ? deleteField() : serverTimestamp() });
      if (cambio.sellos || cambio.entregados) {
        lote.update(doc(db(), 'clientes', p.uid), {
          sellos: increment(cambio.sellos),
          pedidosEntregados: increment(cambio.entregados),
          ...(a === 'entregado' ? { ultimoPedidoEn: serverTimestamp() } : {}),
        });
      }
      await lote.commit();
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.ocupado.set('');
    }
  }

  cuando(p: PedidoConId): string {
    const fecha = p.creadoEn?.toDate();
    return fecha ? fecha.toLocaleString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Ahora';
  }

  celular(p: PedidoConId): string {
    return formatoCelular(p.cliente.celular);
  }

  whatsapp(p: PedidoConId): string {
    return enlaceWhatsApp(p.cliente.celular, `Hola, ${p.cliente.nombre.split(' ')[0]}. Te escribimos de ${CLIENTE.nombreCorto} por tu pedido.`);
  }

  clase(estado: EstadoPedido): string {
    return estado === 'entregado' ? 'bg-fresco-500/20 text-fresco-200' : estado === 'cancelado' ? 'bg-primario-500/20 text-primario-200' : 'bg-destello-400 text-sobre-destello';
  }
}
