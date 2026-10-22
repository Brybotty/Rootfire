import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { CLIENTE } from '../config/cliente';
import { enlaceWhatsApp, formatoCelular } from './contacto';
import { estadoNegocio, formatoTurnos, semana } from './horario';

/** Estado del local (abierto o cerrado, en hora de Colombia) y enlaces de contacto. */
@Injectable({ providedIn: 'root' })
export class NegocioService {
  readonly cliente = CLIENTE;
  /** Se actualiza cada minuto (y al volver a la pestaña). */
  readonly ahora = signal(new Date());
  readonly estado = computed(() => estadoNegocio(CLIENTE.horario, this.ahora(), CLIENTE.horarioFestivos));
  readonly semana = computed(() => semana(CLIENTE.horario, this.ahora(), CLIENTE.horarioFestivos));
  /** "5:30 p. m. – 10:30 p. m." si los festivos se atiende; vacío si no hay horario de festivos o se cierra. */
  readonly horasFestivos = CLIENTE.horarioFestivos?.length ? formatoTurnos(CLIENTE.horarioFestivos) : '';
  readonly abierto = computed(() => ['abierto', 'cierra-pronto'].includes(this.estado().tipo));

  readonly whatsapp = computed(() => {
    const w = CLIENTE.contacto.whatsapp;
    return w.activo && w.numero ? enlaceWhatsApp(w.numero, w.mensaje) : null;
  });
  /** "305 908 3313" (solo si el WhatsApp está activo). */
  readonly telefono = computed(() => (this.whatsapp() ? formatoCelular(CLIENTE.contacto.whatsapp.numero) : ''));
  readonly instagram = CLIENTE.redes.find((r) => r.red === 'instagram') ?? null;

  constructor() {
    const tic = () => this.ahora.set(new Date());
    const intervalo = setInterval(tic, 60_000);
    const alVolver = () => document.visibilityState === 'visible' && tic();
    document.addEventListener('visibilitychange', alVolver);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
    });
  }

  /** Enlace de WhatsApp con un mensaje sobre un plato (o null si el botón está apagado). */
  whatsappSobre(plato: string): string | null {
    return this.whatsappCon(`Hola, Rootfire. Quiero preguntar por: ${plato}`);
  }

  /** Enlace de WhatsApp con el mensaje que se le pase (o null si el botón está apagado). */
  whatsappCon(mensaje: string): string | null {
    const w = CLIENTE.contacto.whatsapp;
    return w.activo && w.numero ? enlaceWhatsApp(w.numero, mensaje) : null;
  }
}
