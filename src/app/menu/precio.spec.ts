import { formatoAdicional, formatoPrecio } from './precio';

const NBSP = ' ';

describe('formatoPrecio', () => {
  it('usa el formato colombiano con punto de miles y sin decimales', () => {
    expect(formatoPrecio(28000)).toBe(`$${NBSP}28.000`);
    expect(formatoPrecio(49900)).toBe(`$${NBSP}49.900`);
    expect(formatoPrecio(1250000)).toBe(`$${NBSP}1.250.000`);
  });

  it('redondea los valores con decimales', () => {
    expect(formatoPrecio(9999.6)).toBe(`$${NBSP}10.000`);
  });

  it('muestra valores pequeños y cero', () => {
    expect(formatoPrecio(500)).toBe(`$${NBSP}500`);
    expect(formatoPrecio(0)).toBe(`$${NBSP}0`);
  });

  it('no deja el signo separado del número', () => {
    expect(formatoPrecio(28000)).not.toContain(' ');
  });
});

describe('formatoAdicional', () => {
  it('antepone el signo más', () => {
    expect(formatoAdicional(4000)).toBe(`+${NBSP}$${NBSP}4.000`);
  });
});
