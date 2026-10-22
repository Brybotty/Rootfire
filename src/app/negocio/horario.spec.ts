import type { HorarioSemana } from '../config/modelo';
import { aLaHora, estadoNegocio, formatoHora, horarioSchema, relojColombia, semana } from './horario';

const NBSP = ' ';
const pm = (h: string) => `${h}${NBSP}p.${NBSP}m.`;
const am = (h: string) => `${h}${NBSP}a.${NBSP}m.`;

/** Fecha a partir de la hora de Colombia (UTC-5): '2026-10-01T20:00' es jueves a las 8 p. m. */
const colombia = (fechaHora: string) => new Date(`${fechaHora}:00-05:00`);

const HORARIO: HorarioSemana = [
  [{ abre: '12:00', cierra: '22:00' }], // domingo
  [], // lunes
  [], // martes
  [], // miércoles
  [{ abre: '17:00', cierra: '23:00' }], // jueves
  [{ abre: '17:00', cierra: '01:00' }], // viernes (cierra el sábado)
  [{ abre: '17:00', cierra: '01:00' }], // sábado (cierra el domingo)
];

describe('relojColombia', () => {
  it('usa la hora de Colombia aunque el navegador esté en otra zona', () => {
    // 03:00 UTC del viernes = 10:00 p. m. del jueves en Colombia
    expect(relojColombia(new Date('2026-10-02T03:00:00Z'))).toEqual({ dia: 4, minutos: 22 * 60 });
  });
});

describe('formatoHora y aLaHora', () => {
  it('formato de 12 horas como en Colombia', () => {
    expect(formatoHora(17 * 60 + 30)).toBe(pm('5:30'));
    expect(formatoHora(17 * 60)).toBe(pm('5'));
    expect(formatoHora(9 * 60 + 5)).toBe(am('9:05'));
    expect(formatoHora(0)).toBe('medianoche');
    expect(formatoHora(24 * 60)).toBe('medianoche');
    expect(formatoHora(12 * 60)).toBe('mediodía');
  });

  it('"a la 1" en singular y "a las" en plural', () => {
    expect(aLaHora(60)).toBe(`a la ${am('1')}`);
    expect(aLaHora(13 * 60 + 30)).toBe(`a la ${pm('1:30')}`);
    expect(aLaHora(23 * 60)).toBe(`a las ${pm('11')}`);
    expect(aLaHora(0)).toBe('a medianoche');
  });
});

describe('estadoNegocio con horas', () => {
  it('abierto, con la hora de cierre', () => {
    const e = estadoNegocio(HORARIO, colombia('2026-10-01T20:00'));
    expect(e.tipo).toBe('abierto');
    expect(e.titulo).toBe('Abierto ahora');
    expect(e.detalle).toBe(`cierra a las ${pm('11')}`);
    expect(e.dia).toBe(4);
  });

  it('avisa cuando está por cerrar', () => {
    const e = estadoNegocio(HORARIO, colombia('2026-10-01T22:30'));
    expect(e.tipo).toBe('cierra-pronto');
    expect(e.detalle).toBe(`cierra a las ${pm('11')}`);
  });

  it('antes de abrir: abre hoy', () => {
    const e = estadoNegocio(HORARIO, colombia('2026-10-01T16:00'));
    expect(e.tipo).toBe('cerrado');
    expect(e.titulo).toBe('Cerrado ahora');
    expect(e.detalle).toBe(`abre hoy a las ${pm('5')}`);
  });

  it('al cerrar: abre mañana', () => {
    expect(estadoNegocio(HORARIO, colombia('2026-10-01T23:30')).detalle).toBe(`abre mañana a las ${pm('5')}`);
  });

  it('el turno que pasa de medianoche sigue abierto al día siguiente', () => {
    const e = estadoNegocio(HORARIO, colombia('2026-10-03T00:30')); // sábado 12:30 a. m., turno del viernes
    expect(e.tipo).toBe('cierra-pronto');
    expect(e.detalle).toBe(`cierra a la ${am('1')}`);
    expect(estadoNegocio(HORARIO, colombia('2026-10-02T23:30')).tipo).toBe('abierto');
  });

  it('el turno del sábado que termina el domingo (cambio de semana)', () => {
    const e = estadoNegocio(HORARIO, colombia('2026-10-04T00:10')); // domingo 12:10 a. m.
    expect(e.tipo).toBe('abierto');
    expect(e.dia).toBe(0);
  });

  it('un día cerrado busca el próximo día con turno', () => {
    const e = estadoNegocio(HORARIO, colombia('2026-10-05T10:00')); // lunes
    expect(e.titulo).toBe('Cerrado hoy');
    expect(e.detalle).toBe(`abre el jueves a las ${pm('5')}`);
    expect(estadoNegocio(HORARIO, colombia('2026-10-07T10:00')).detalle).toBe(`abre mañana a las ${pm('5')}`);
  });

  it('el domingo en la noche salta al jueves', () => {
    expect(estadoNegocio(HORARIO, colombia('2026-10-04T23:00')).detalle).toBe(`abre el jueves a las ${pm('5')}`);
  });
});

describe('estadoNegocio con días sin hora (caso actual de Rootfire)', () => {
  const SOLO_DIAS: HorarioSemana = [null, [], [], [], null, null, null];

  it('un día de atención sin hora confirmada', () => {
    const e = estadoNegocio(SOLO_DIAS, colombia('2026-10-01T15:00'));
    expect(e.tipo).toBe('hoy');
    expect(e.titulo).toBe('Hoy atendemos');
  });

  it('un día cerrado dice cuándo vuelve', () => {
    expect(estadoNegocio(SOLO_DIAS, colombia('2026-10-05T12:00')).detalle).toBe('abrimos el jueves');
    expect(estadoNegocio(SOLO_DIAS, colombia('2026-10-07T12:00')).detalle).toBe('abrimos mañana');
  });

  it('sin ningún horario', () => {
    const e = estadoNegocio([[], [], [], [], [], [], []], colombia('2026-10-01T12:00'));
    expect(e.tipo).toBe('sin-horario');
    expect(e.titulo).toBe('Horario por confirmar');
  });
});

describe('semana', () => {
  it('empieza el lunes y marca hoy', () => {
    const filas = semana(HORARIO, colombia('2026-10-01T12:00'));
    expect(filas.map((f) => f.nombre)).toEqual(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']);
    expect(filas.filter((f) => f.esHoy).map((f) => f.nombre)).toEqual(['Jueves']);
    expect(filas[0].horas).toBe('Cerrado');
    expect(filas[4].horas).toBe(`${pm('5')} – ${am('1')}`);
  });

  it('muestra "Hora por confirmar" en los días sin hora', () => {
    expect(semana([null, [], [], [], null, null, null], colombia('2026-10-04T12:00'))[6]).toEqual(
      jasmine.objectContaining({ nombre: 'Domingo', horas: 'Hora por confirmar', tipo: 'por-confirmar', esHoy: true }),
    );
  });
});

describe('festivos (Rootfire: jueves a domingo y festivos, de 5:30 a 10:30 p. m.)', () => {
  const TURNO = [{ abre: '17:30', cierra: '22:30' }];
  const ROOTFIRE: HorarioSemana = [TURNO, [], [], [], TURNO, TURNO, TURNO];

  it('un lunes festivo abre con el horario de festivos', () => {
    // 12 de octubre de 2026: lunes festivo.
    const e = estadoNegocio(ROOTFIRE, colombia('2026-10-12T19:00'), TURNO);
    expect(e.tipo).toBe('abierto');
    expect(e.detalle).toBe(`cierra a las ${pm('10:30')}`);
    expect(estadoNegocio(ROOTFIRE, colombia('2026-10-12T16:00'), TURNO).detalle).toBe(`abre hoy a las ${pm('5:30')}`);
  });

  it('sin horario de festivos, ese lunes es un lunes más', () => {
    expect(estadoNegocio(ROOTFIRE, colombia('2026-10-12T19:00')).titulo).toBe('Cerrado hoy');
  });

  it('un lunes cualquiera sigue cerrado', () => {
    const e = estadoNegocio(ROOTFIRE, colombia('2026-10-05T19:00'), TURNO);
    expect(e.titulo).toBe('Cerrado hoy');
    expect(e.detalle).toBe(`abre el jueves a las ${pm('5:30')}`);
  });

  it('al cerrar el domingo anuncia el festivo que viene', () => {
    expect(estadoNegocio(ROOTFIRE, colombia('2026-10-11T23:00'), TURNO).detalle).toBe(`abre mañana a las ${pm('5:30')}`);
    // Domingo 6 de diciembre: el lunes se cierra y el martes 8 es festivo.
    expect(estadoNegocio(ROOTFIRE, colombia('2026-12-06T23:00'), TURNO).detalle).toBe(`abre el martes festivo a las ${pm('5:30')}`);
  });

  it('con los festivos cerrados (lista vacía), un viernes festivo no abre', () => {
    const e = estadoNegocio(ROOTFIRE, colombia('2026-12-25T19:00'), []);
    expect(e.titulo).toBe('Cerrado hoy');
    expect(e.detalle).toBe(`abre mañana a las ${pm('5:30')}`);
  });

  it('semana: el lunes festivo que viene sale con su horario y marcado', () => {
    const filas = semana(ROOTFIRE, colombia('2026-10-08T12:00'), TURNO); // jueves 8: el próximo lunes es el 12
    expect(filas[0]).toEqual(jasmine.objectContaining({ nombre: 'Lunes', tipo: 'abierto', festivo: true, horas: `${pm('5:30')} – ${pm('10:30')}` }));
    expect(filas[1]).toEqual(jasmine.objectContaining({ nombre: 'Martes', tipo: 'cerrado', festivo: false }));
    expect(filas[3]).toEqual(jasmine.objectContaining({ nombre: 'Jueves', esHoy: true, festivo: false }));
    // Una semana sin festivos: lunes cerrado.
    expect(semana(ROOTFIRE, colombia('2026-10-13T12:00'), TURNO)[0].tipo).toBe('cerrado');
  });
});

describe('horarioSchema', () => {
  it('solo incluye los días con hora conocida', () => {
    expect(horarioSchema([null, [], [], [], null, null, null])).toEqual([]);
    const datos = horarioSchema(HORARIO);
    expect(datos.length).toBe(4);
    expect(datos[1]).toEqual({ '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Thursday', opens: '17:00', closes: '23:00' });
  });
});
