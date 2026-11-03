import { celdaCsv, csv } from './csv';

describe('csv', () => {
  it('pone comillas y duplica las de adentro', () => {
    expect(celdaCsv('La "Clásica"')).toBe('"La ""Clásica"""');
    expect(celdaCsv(undefined)).toBe('""');
    expect(celdaCsv(8)).toBe('"8"');
  });

  it('desarma lo que Excel tomaría como fórmula', () => {
    expect(celdaCsv('=HYPERLINK("https://ejemplo.com","clic")')).toBe('"\'=HYPERLINK(""https://ejemplo.com"",""clic"")"');
    expect(celdaCsv('+57 300')).toBe('"\'+57 300"');
    expect(celdaCsv('-1')).toBe('"\'-1"');
    expect(celdaCsv('@SUMA(A1)')).toBe('"\'@SUMA(A1)"');
    expect(celdaCsv('Ana = Ana')).toBe('"Ana = Ana"');
  });

  it('separa con punto y coma y empieza con BOM', () => {
    expect(csv([['a', 'b'], [1, 2]])).toBe('﻿"a";"b"\r\n"1";"2"');
  });
});
