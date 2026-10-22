/**
 * Festivos de Colombia, calculados (sirven para cualquier año, sin lista que actualizar):
 * - fijos: se celebran el día que caen;
 * - trasladables (Ley 51 de 1983, "ley Emiliani"): pasan al lunes siguiente si no caen en lunes;
 * - los que dependen de la Pascua: Jueves y Viernes Santo, y tres que siempre caen en lunes.
 *
 * Las fechas son días de calendario: se manejan como medianoche UTC para no depender de la zona de quien mira.
 */

const DIA = 86_400_000;

/** [mes, día] */
const FIJOS = [
  [1, 1], // Año Nuevo
  [5, 1], // Día del Trabajo
  [7, 20], // Independencia
  [8, 7], // Batalla de Boyacá
  [12, 8], // Inmaculada Concepción
  [12, 25], // Navidad
];

const TRASLADABLES = [
  [1, 6], // Reyes Magos
  [3, 19], // San José
  [6, 29], // San Pedro y San Pablo
  [8, 15], // Asunción de la Virgen
  [10, 12], // Día de la Raza
  [11, 1], // Todos los Santos
  [11, 11], // Independencia de Cartagena
];

/** Días desde el Domingo de Pascua: Jueves Santo, Viernes Santo, Ascensión, Corpus Christi y Sagrado Corazón. */
const DESDE_PASCUA = [-3, -2, 43, 64, 71];

const fecha = (anio: number, mes: number, dia: number) => Date.UTC(anio, mes - 1, dia);

/** Domingo de Pascua (algoritmo gregoriano anónimo, de Meeus). */
export function pascua(anio: number): number {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return fecha(anio, mes, dia);
}

/** El mismo día si es lunes; si no, el lunes siguiente. */
function alLunes(t: number): number {
  const diaSemana = new Date(t).getUTCDay();
  return t + ((8 - diaSemana) % 7) * DIA;
}

const porAnio = new Map<number, Set<number>>();

/** Los 18 festivos del año, como medianoche UTC de cada día. */
export function festivosColombia(anio: number): Set<number> {
  let lista = porAnio.get(anio);
  if (!lista) {
    const domingo = pascua(anio);
    lista = new Set([
      ...FIJOS.map(([mes, dia]) => fecha(anio, mes, dia)),
      ...TRASLADABLES.map(([mes, dia]) => alLunes(fecha(anio, mes, dia))),
      ...DESDE_PASCUA.map((dias) => domingo + dias * DIA),
    ]);
    porAnio.set(anio, lista);
  }
  return lista;
}

/** `dia`: medianoche UTC del día de calendario que se quiere mirar. */
export function esFestivo(dia: number): boolean {
  return festivosColombia(new Date(dia).getUTCFullYear()).has(dia);
}
