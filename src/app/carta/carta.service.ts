import { Injectable, signal } from '@angular/core';
import { CLIENTE } from '../config/cliente';
import { MENU } from '../config/menu';
import { firebaseListo } from '../firebase/config';
import { leerDocumento } from '../firebase/rest';
import { type Carta, normalizarCarta } from './carta';

const CLAVE = `${CLIENTE.id}:carta`;
export const RUTA_CARTA = 'publico/carta';

/** La carta de los archivos del proyecto: con la que arranca la página y la que el admin carga en Firestore. */
export function cartaInicial(): Carta {
  return { menu: MENU, promociones: CLIENTE.promocion ? [CLIENTE.promocion] : [], club: CLIENTE.club };
}

function leerCopia(): Carta | null {
  if (!firebaseListo) return null;
  try {
    return normalizarCarta(JSON.parse(localStorage.getItem(CLAVE) ?? 'null'), cartaInicial());
  } catch {
    return null;
  }
}

/**
 * La carta que se muestra. Arranca con la copia que dejó la visita anterior (o la de los archivos del proyecto) y
 * en cuanto la página está pintada la pide a Firestore: si el admin cambió un precio, se ve sin publicar nada.
 * Sin conexión sigue la copia; si la carta aún no está en Firestore, la de los archivos.
 */
@Injectable({ providedIn: 'root' })
export class CartaService {
  readonly carta = signal<Carta>(leerCopia() ?? cartaInicial());

  private avisarLista: () => void = () => {};
  /** Se cumple cuando terminó la primera consulta a Firestore (de una vez si no hay Firebase). */
  readonly lista = new Promise<void>((listo) => (this.avisarLista = listo));

  constructor() {
    if (!firebaseListo) this.avisarLista();
  }

  async actualizar(): Promise<void> {
    if (!firebaseListo) return;
    try {
      await this.consultar();
    } finally {
      this.avisarLista();
    }
  }

  private async consultar() {
    let datos: Record<string, unknown> | null;
    try {
      datos = await leerDocumento(RUTA_CARTA);
    } catch {
      return; // Sin conexión o Firestore no responde: se queda la copia.
    }
    const carta = datos ? normalizarCarta(datos, cartaInicial()) : cartaInicial();
    if (!carta) return;
    // Igual a la copia (lo normal): no se vuelve a pintar nada.
    if (JSON.stringify(carta) !== JSON.stringify(this.carta())) this.carta.set(carta);
    try {
      if (datos) localStorage.setItem(CLAVE, JSON.stringify(carta));
      else localStorage.removeItem(CLAVE);
    } catch {
      // Navegación privada o almacenamiento lleno: la próxima visita arranca con la carta de los archivos.
    }
  }
}
