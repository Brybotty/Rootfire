import { esFestivo, festivosColombia, pascua } from './festivos';

const fecha = (t: number) => new Date(t).toISOString().slice(0, 10);
const dia = (texto: string) => Date.parse(`${texto}T00:00:00Z`);

describe('festivos de Colombia', () => {
  it('calcula el Domingo de Pascua', () => {
    expect(fecha(pascua(2026))).toBe('2026-04-05');
    expect(fecha(pascua(2027))).toBe('2027-03-28');
  });

  it('los 18 festivos de 2026', () => {
    expect([...festivosColombia(2026)].sort((a, b) => a - b).map(fecha)).toEqual([
      '2026-01-01', // Año Nuevo
      '2026-01-12', // Reyes (6 de enero, martes → lunes siguiente)
      '2026-03-23', // San José
      '2026-04-02', // Jueves Santo
      '2026-04-03', // Viernes Santo
      '2026-05-01', // Día del Trabajo
      '2026-05-18', // Ascensión
      '2026-06-08', // Corpus Christi
      '2026-06-15', // Sagrado Corazón
      '2026-06-29', // San Pedro y San Pablo (cae en lunes: no se mueve)
      '2026-07-20', // Independencia
      '2026-08-07', // Batalla de Boyacá
      '2026-08-17', // Asunción
      '2026-10-12', // Día de la Raza
      '2026-11-02', // Todos los Santos (1 de noviembre, domingo → lunes)
      '2026-11-16', // Independencia de Cartagena
      '2026-12-08', // Inmaculada Concepción
      '2026-12-25', // Navidad
    ]);
  });

  it('los trasladables pasan al lunes siguiente y los fijos se quedan en su día', () => {
    expect(esFestivo(dia('2027-10-12'))).toBeFalse(); // martes
    expect(esFestivo(dia('2027-10-18'))).toBeTrue();
    expect(esFestivo(dia('2027-11-01'))).toBeTrue(); // ya es lunes
    expect(esFestivo(dia('2027-07-20'))).toBeTrue(); // martes, fijo
    expect(esFestivo(dia('2026-10-08'))).toBeFalse();
  });
});
