import { enlaceWhatsApp, formatoCelular, soloDigitos } from './contacto';

describe('contacto', () => {
  it('limpia el número', () => {
    expect(soloDigitos('+57 300 123-4567')).toBe('573001234567');
  });

  it('agrega el indicativo a un celular colombiano', () => {
    expect(enlaceWhatsApp('300 123 4567')).toBe('https://wa.me/573001234567');
    expect(enlaceWhatsApp('573001234567')).toBe('https://wa.me/573001234567');
  });

  it('codifica el mensaje', () => {
    expect(enlaceWhatsApp('3001234567', 'Hola, ¿tienen la Clásica?')).toBe(
      'https://wa.me/573001234567?text=Hola%2C%20%C2%BFtienen%20la%20Cl%C3%A1sica%3F',
    );
  });

  it('muestra el celular en grupos de 3, 3 y 4', () => {
    expect(formatoCelular('573059083313')).toBe('305 908 3313');
    expect(formatoCelular('3059083313')).toBe('305 908 3313');
    expect(formatoCelular('6021234')).toBe('6021234');
  });
});
