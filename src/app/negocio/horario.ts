import type { HorarioSemana, Turno } from '../config/modelo';
import { esFestivo } from './festivos';

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DIAS_SCHEMA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MINUTOS_DIA = 1440;
const DIA_MS = 86_400_000;
/** Colombia está en UTC-5 todo el año (no tiene horario de verano). */
const DESFASE_COLOMBIA = -5 * 60;
const NBSP = ' ';

/** Día de la semana (0 = domingo) y minutos desde medianoche en Colombia, sin importar dónde esté quien mira. */
export function relojColombia(ahora: Date = new Date()): { dia: number; minutos: number } {
  const local = new Date(ahora.getTime() + DESFASE_COLOMBIA * 60_000);
  return { dia: local.getUTCDay(), minutos: local.getUTCHours() * 60 + local.getUTCMinutes() };
}

/** El día de calendario que es en Colombia, como medianoche UTC (para sumar días y mirar festivos). */
export function hoyColombia(ahora: Date = new Date()): number {
  const local = new Date(ahora.getTime() + DESFASE_COLOMBIA * 60_000);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
}

/** '17:30' → 1050. */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** 1050 → '5:30 p. m.'; 1020 → '5 p. m.'; 0 → 'medianoche'; 720 → 'mediodía'. */
export function formatoHora(minutos: number): string {
  const m = ((minutos % MINUTOS_DIA) + MINUTOS_DIA) % MINUTOS_DIA;
  if (m === 0) return 'medianoche';
  if (m === 720) return 'mediodía';
  const h = Math.floor(m / 60);
  const min = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${min ? `:${String(min).padStart(2, '0')}` : ''}${NBSP}${h < 12 ? 'a.' : 'p.'}${NBSP}m.`;
}

/** "a las 11 p. m.", "a la 1 a. m.", "a medianoche", "al mediodía". */
export function aLaHora(minutos: number): string {
  const texto = formatoHora(minutos);
  if (texto === 'medianoche') return 'a medianoche';
  if (texto === 'mediodía') return 'al mediodía';
  return texto.startsWith(`1${NBSP}`) || texto.startsWith('1:') ? `a la ${texto}` : `a las ${texto}`;
}

/** '5:30 p. m. – 10:30 p. m.' (varios turnos separados por ' · '). */
export function formatoTurnos(turnos: Turno[]): string {
  return turnos.map((t) => `${formatoHora(aMinutos(t.abre))} – ${formatoHora(aMinutos(t.cierra))}`).join(' · ');
}

/**
 * Turnos de un día concreto (`dia`: medianoche UTC de ese día de calendario). Si es festivo y el negocio tiene
 * horario de festivos, manda ese; si no, el de su día de la semana.
 */
function turnosDel(dia: number, horario: HorarioSemana, festivos?: Turno[]): { turnos: Turno[] | null; festivo: boolean } {
  const festivo = !!festivos && esFestivo(dia);
  return { turnos: festivo ? festivos! : horario[new Date(dia).getUTCDay()], festivo };
}

export type TipoEstado = 'abierto' | 'cierra-pronto' | 'cerrado' | 'hoy' | 'sin-horario';

export interface EstadoNegocio {
  tipo: TipoEstado;
  /** 'Abierto ahora', 'Cerrado ahora', 'Hoy atendemos'… */
  titulo: string;
  /** 'cierra a las 11 p. m.', 'abre el jueves a las 5 p. m.'… (puede ir vacío). */
  detalle: string;
  /** Día de hoy en Colombia (0 = domingo), para resaltar el horario. */
  dia: number;
}

/** Minutos antes del cierre en que se avisa "Cierra pronto". */
export const AVISO_CIERRE = 45;

/**
 * `festivos`: horario de los festivos de Colombia, caigan el día que caigan (p. ej. un lunes en que normalmente
 * no se atiende). Sin él, un festivo es un día cualquiera de la semana.
 */
export function estadoNegocio(horario: HorarioSemana, ahora: Date = new Date(), festivos?: Turno[]): EstadoNegocio {
  const { dia, minutos } = relojColombia(ahora);
  const hoy = hoyColombia(ahora);
  /** Turnos de hoy (0), ayer (-1), mañana (1)… */
  const turnosEn = (k: number) => turnosDel(hoy + k * DIA_MS, horario, festivos);

  // ¿Dentro de un turno? Se mira también el de ayer, por si pasa de medianoche.
  for (const k of [-1, 0]) {
    for (const t of turnosEn(k).turnos ?? []) {
      const inicio = k * MINUTOS_DIA + aMinutos(t.abre);
      let fin = k * MINUTOS_DIA + aMinutos(t.cierra);
      if (fin <= inicio) fin += MINUTOS_DIA;
      if (minutos >= inicio && minutos < fin) {
        const cierre = aLaHora(fin);
        return fin - minutos <= AVISO_CIERRE
          ? { tipo: 'cierra-pronto', titulo: 'Cierra pronto', detalle: `cierra ${cierre}`, dia }
          : { tipo: 'abierto', titulo: 'Abierto ahora', detalle: `cierra ${cierre}`, dia };
      }
    }
  }

  const deHoy = turnosEn(0).turnos;
  if (deHoy === null) {
    return { tipo: 'hoy', titulo: 'Hoy atendemos', detalle: 'horario por confirmar', dia };
  }

  const titulo = deHoy.length === 0 ? 'Cerrado hoy' : 'Cerrado ahora';

  // Próxima apertura en los siguientes 7 días.
  for (let k = 0; k <= 7; k++) {
    const d = (dia + k) % 7;
    const { turnos, festivo } = turnosEn(k);
    // "el lunes festivo": aclara por qué abre un día en que normalmente no se atiende.
    const cuando = k === 0 ? 'hoy' : k === 1 ? 'mañana' : `el ${DIAS[d]}${festivo && horario[d]?.length === 0 ? ' festivo' : ''}`;
    if (turnos === null && k > 0) {
      return { tipo: 'cerrado', titulo, detalle: k === 1 ? 'abrimos mañana' : `abrimos el ${DIAS[d]}`, dia };
    }
    const siguiente = (turnos ?? [])
      .map((t) => aMinutos(t.abre))
      .filter((abre) => k > 0 || abre > minutos)
      .sort((a, b) => a - b)[0];
    if (siguiente !== undefined) {
      return { tipo: 'cerrado', titulo, detalle: `abre ${cuando} ${aLaHora(siguiente)}`, dia };
    }
  }

  return { tipo: 'sin-horario', titulo: 'Horario por confirmar', detalle: '', dia };
}

export interface FilaHorario {
  dia: number;
  nombre: string;
  horas: string;
  tipo: 'abierto' | 'cerrado' | 'por-confirmar';
  esHoy: boolean;
  /** Ese día es festivo y se atiende con el horario de festivos. */
  festivo: boolean;
}

/**
 * Horario de la semana empezando por el lunes, con el día de hoy marcado. Cada fila es la próxima vez que llega
 * ese día (hoy incluido): así un lunes festivo sale con su horario y no como "Cerrado".
 */
export function semana(horario: HorarioSemana, ahora: Date = new Date(), festivos?: Turno[]): FilaHorario[] {
  const hoy = relojColombia(ahora).dia;
  const inicio = hoyColombia(ahora);
  return [1, 2, 3, 4, 5, 6, 0].map((dia) => {
    const { turnos, festivo } = turnosDel(inicio + ((dia - hoy + 7) % 7) * DIA_MS, horario, festivos);
    const nombre = DIAS[dia][0].toUpperCase() + DIAS[dia].slice(1);
    const base = { dia, nombre, esHoy: dia === hoy, festivo };
    if (turnos === null) return { ...base, horas: 'Hora por confirmar', tipo: 'por-confirmar' };
    if (turnos.length === 0) return { ...base, horas: 'Cerrado', tipo: 'cerrado' };
    return { ...base, horas: formatoTurnos(turnos), tipo: 'abierto' };
  });
}

/** Días con horario conocido, para los datos estructurados (schema.org/OpeningHoursSpecification). */
export function horarioSchema(horario: HorarioSemana) {
  return horario.flatMap((turnos, dia) =>
    (turnos ?? []).map((t) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${DIAS_SCHEMA[dia]}`,
      opens: t.abre,
      closes: t.cierra,
    })),
  );
}
