import { Injectable, computed, signal } from '@angular/core';
import { CLIENTE } from '../config/cliente';

/** Contenido de otras empresas que la página solo carga con permiso: guarda las cookies de esas empresas. */
export type ContenidoExterno = 'mapa';

export interface Preferencias {
  mapa: boolean;
  /** Cuándo se guardó la elección (ISO). */
  fecha: string;
}

const CLAVE = `${CLIENTE.id}:cookies-v1`;

/**
 * Permiso del visitante para el contenido de terceros: el mapa de Google de cómo llegar (igual que las
 * publicaciones de Instagram en El Acicale).
 *
 * La página no usa cookies de publicidad ni de medición. Lo necesario para funcionar (el pedido, la sesión del Club,
 * la copia de la carta y esta misma preferencia) no pide permiso; lo que sí lo pide es lo que hace que otra empresa
 * guarde cookies en el navegador. Hasta que el visitante acepta, en lugar del mapa sale un botón para verlo.
 */
@Injectable({ providedIn: 'root' })
export class ConsentimientoService {
  /** null: todavía no ha elegido (se muestra el aviso). */
  readonly preferencias = signal<Preferencias | null>(leer());
  /** El visitante abrió "Preferencias de cookies" desde el pie de página. */
  readonly configurando = signal(false);

  readonly decidido = computed(() => this.preferencias() !== null);
  readonly mapa = computed(() => this.preferencias()?.mapa === true);

  aceptarTodo() {
    this.guardar({ mapa: true });
  }

  soloNecesarias() {
    this.guardar({ mapa: false });
  }

  /** Permite un contenido desde su propio botón ("Ver el mapa aquí"). */
  permitir(contenido: ContenidoExterno) {
    this.guardar({ ...this.preferencias(), [contenido]: true } as Pick<Preferencias, ContenidoExterno>);
  }

  guardar(eleccion: Pick<Preferencias, ContenidoExterno>) {
    const preferencias: Preferencias = { mapa: eleccion.mapa, fecha: new Date().toISOString() };
    this.preferencias.set(preferencias);
    this.configurando.set(false);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(preferencias));
    } catch {
      // Navegación privada o almacenamiento bloqueado: la elección vale mientras dure la visita.
    }
  }

  abrirPreferencias() {
    this.configurando.set(true);
  }
}

function leer(): Preferencias | null {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? 'null');
    return guardado && typeof guardado.mapa === 'boolean' ? guardado : null;
  } catch {
    return null;
  }
}
