import { Injectable, computed, signal } from '@angular/core';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { type Carta, normalizarCarta } from '../carta/carta';
import { RUTA_CARTA, cartaInicial } from '../carta/carta.service';
import { db } from '../firebase/sdk';

/**
 * La carta que edita el panel (menú, promos y ajustes del Club). Se trabaja sobre un borrador: nada cambia en la
 * página hasta tocar "Publicar cambios", que guarda el documento entero `publico/carta`. Lo publicado se ve en la
 * página en la siguiente visita (o al recargar), sin volver a desplegar nada.
 */
@Injectable()
export class CartaAdminService {
  /** null: todavía no se ha leído de Firestore. */
  readonly borrador = signal<Carta | null>(null);
  /** El documento aún no existe: la carta sale de los archivos del proyecto hasta que se publique la primera vez. */
  readonly nueva = signal(false);
  readonly guardando = signal(false);
  private readonly publicada = signal('');
  /** Hay cambios sin publicar. */
  readonly sucia = computed(() => {
    const b = this.borrador();
    return !!b && (this.nueva() || JSON.stringify(b) !== this.publicada());
  });

  async cargar() {
    const datos = await getDoc(doc(db(), RUTA_CARTA));
    const carta = datos.exists() ? normalizarCarta(fechasATexto(datos.data()), cartaInicial()) : null;
    this.nueva.set(!carta);
    this.fijar(carta ?? cartaInicial());
  }

  /** Cambia el borrador (sin publicar). */
  cambiar(cambio: (carta: Carta) => Carta) {
    const actual = this.borrador();
    if (actual) this.borrador.set(cambio(structuredClone(actual)));
  }

  async publicar() {
    const carta = this.borrador();
    if (!carta) return;
    this.guardando.set(true);
    try {
      const { actualizadaEn: _, ...resto } = carta;
      await setDoc(doc(db(), RUTA_CARTA), { ...resto, actualizadaEn: serverTimestamp() });
      this.nueva.set(false);
      this.fijar({ ...carta, actualizadaEn: new Date().toISOString() });
    } finally {
      this.guardando.set(false);
    }
  }

  /** Deja el borrador como estaba publicado. */
  descartar() {
    const publicada = this.publicada();
    if (publicada) this.borrador.set(JSON.parse(publicada));
  }

  private fijar(carta: Carta) {
    // Sin `undefined` (Firestore no los guarda): así el borrador y lo publicado se comparan igual.
    const limpia = JSON.parse(JSON.stringify(carta)) as Carta;
    this.publicada.set(JSON.stringify(limpia));
    this.borrador.set(limpia);
  }
}

/** Las fechas de Firestore (Timestamp) como texto ISO, igual que las da la lectura REST de la página. */
function fechasATexto(datos: Record<string, unknown>): Record<string, unknown> {
  const fecha = datos['actualizadaEn'] as { toDate?: () => Date } | undefined;
  return { ...datos, actualizadaEn: fecha?.toDate ? fecha.toDate().toISOString() : undefined };
}
