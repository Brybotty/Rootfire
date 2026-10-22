import { paginaDe } from './paginas';

describe('páginas', () => {
  it('cada dirección abre su página, sin importar la barra final o las mayúsculas', () => {
    expect(paginaDe('/')).toBe('menu');
    expect(paginaDe('/politica-de-datos')).toBe('politica');
    expect(paginaDe('/terminos/')).toBe('terminos');
    expect(paginaDe('/cuenta')).toBe('cuenta');
    expect(paginaDe('/club')).toBe('cuenta');
    expect(paginaDe('/ADMIN')).toBe('admin');
  });

  it('cualquier otra dirección abre el menú, como siempre', () => {
    expect(paginaDe('/index.html')).toBe('menu');
    expect(paginaDe('/menu-viejo')).toBe('menu');
  });
});
