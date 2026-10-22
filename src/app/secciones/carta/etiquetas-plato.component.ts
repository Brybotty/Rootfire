import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconoComponent, type NombreIcono } from '../../compartido/icono.component';
import type { Plato } from '../../menu/menu.model';

interface Etiqueta {
  texto: string;
  icono: NombreIcono;
  tipo: 'estado' | 'dieta';
  /** Clases sobre fondo oscuro y sobre papel kraft. */
  oscuro: string;
  papel: string;
  /** Repeticiones del ícono (nivel de picante). */
  veces?: number;
  /** Texto para lectores de pantalla, si es distinto. */
  lector?: string;
}

const FECHA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/** Etiquetas del plato. Estado: agotado, tiempo limitado, nuevo, favorito. Dieta: picante, vegetariano, sin gluten. */
export function etiquetasDe(plato: Plato, completas = false): Etiqueta[] {
  const lista: Etiqueta[] = [];
  const e = plato.etiquetas ?? [];
  if (plato.estado === 'agotado') {
    lista.push({ tipo: 'estado', texto: 'Agotado', icono: 'agotado', oscuro: 'bg-primario-500 text-sobre-primario', papel: 'bg-primario-700 text-white' });
  }
  if (plato.tiempoLimitado) {
    const hasta = plato.tiempoLimitado.hasta;
    const texto = completas && hasta ? `Hasta el ${FECHA.format(new Date(`${hasta}T12:00:00Z`))}` : 'Por tiempo limitado';
    lista.push({ tipo: 'estado', texto, icono: 'reloj', oscuro: 'bg-destello-400 text-sobre-destello', papel: 'bg-fondo-950 text-destello-300' });
  }
  if (e.includes('nuevo')) {
    lista.push({ tipo: 'estado', texto: 'Nuevo', icono: 'destello', oscuro: 'bg-secundario-500/20 text-secundario-300', papel: 'bg-secundario-700 text-white' });
  }
  if (e.includes('favorito')) {
    lista.push({ tipo: 'estado', texto: 'Favorito de la casa', icono: 'llama', oscuro: 'bg-primario-500/20 text-primario-300', papel: 'bg-primario-700 text-white' });
  }
  if (plato.picante) {
    lista.push({
      tipo: 'dieta',
      texto: 'Picante',
      icono: 'chile',
      veces: plato.picante,
      lector: `Picante, nivel ${plato.picante} de 3`,
      oscuro: 'bg-primario-500/20 text-primario-300',
      papel: 'bg-primario-700 text-white',
    });
  }
  if (e.includes('vegetariano')) {
    lista.push({ tipo: 'dieta', texto: 'Vegetariano', icono: 'hoja', oscuro: 'bg-fresco-500/20 text-fresco-300', papel: 'bg-fresco-700 text-white' });
  }
  if (e.includes('sin-gluten')) {
    lista.push({ tipo: 'dieta', texto: 'Sin gluten', icono: 'sin-gluten', oscuro: 'bg-papel-100/10 text-papel-200', papel: 'bg-papel-800 text-papel-100' });
  }
  return lista;
}

/**
 * - estado: etiquetas con texto (Agotado, Por tiempo limitado, Nuevo, Favorito).
 * - dieta: solo íconos redondos (picante, vegetariano, sin gluten), para ir junto al precio.
 * - todas: todo con texto (detalle del plato).
 */
@Component({
  selector: 'app-etiquetas-plato',
  imports: [IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-wrap items-center gap-1.5' },
  template: `
    @for (e of etiquetas(); track e.texto) {
      @if (modo() === 'dieta') {
        <span class="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5" [class]="sobrePapel() ? e.papel : e.oscuro" [attr.title]="e.lector ?? e.texto">
          @for (i of repeticiones(e); track i) {
            <app-icono [nombre]="e.icono" [grosor]="2" class="h-4 w-4" [style.margin-left.px]="i > 0 ? -6 : null" />
          }
          <span class="sr-only">{{ e.lector ?? e.texto }}</span>
        </span>
      } @else {
        <span class="etiqueta" [class]="sobrePapel() ? e.papel : e.oscuro">
          @for (i of repeticiones(e); track i) {
            <app-icono [nombre]="e.icono" [grosor]="2" class="h-3.5 w-3.5" [style.margin-left.px]="i > 0 ? -7 : null" />
          }
          @if (e.lector) {
            <span class="sr-only">{{ e.lector }}</span>
            <span aria-hidden="true">{{ e.texto }}</span>
          } @else {
            {{ e.texto }}
          }
        </span>
      }
    }
  `,
})
export class EtiquetasPlatoComponent {
  plato = input.required<Plato>();
  modo = input<'estado' | 'dieta' | 'todas'>('todas');
  sobrePapel = input(false);
  /** Muestra la fecha del tiempo limitado. */
  completas = input(false);
  readonly etiquetas = computed(() => {
    const todas = etiquetasDe(this.plato(), this.completas());
    const modo = this.modo();
    return modo === 'todas' ? todas : todas.filter((e) => e.tipo === modo);
  });

  repeticiones(e: Etiqueta): number[] {
    return Array.from({ length: e.veces ?? 1 }, (_, i) => i);
  }
}
