import type { Categoria, Plato } from './menu.model';
import {
  FILTROS_VACIOS,
  agruparPorCategoria,
  coincideTexto,
  enRango,
  filtrarPlatos,
  filtrosActivos,
  hayFiltros,
  normalizar,
  rangosDePrecio,
  textoBuscable,
} from './filtros';

const categorias: Categoria[] = [
  { id: 'bebidas', nombre: 'Bebidas', icono: 'bebida', orden: 2 },
  { id: 'hamburguesas', nombre: 'Hamburguesas', icono: 'hamburguesa', orden: 1 },
  { id: 'postres', nombre: 'Postres', icono: 'postre', orden: 3 },
];

const plato = (p: Partial<Plato> & Pick<Plato, 'id' | 'categoriaId' | 'precio'>): Plato => ({
  nombre: p.id,
  descripcion: '',
  ingredientes: [],
  orden: 1,
  ...p,
});

const platos: Plato[] = [
  plato({ id: 'limonada', categoriaId: 'bebidas', precio: 7000, nombre: 'Limonada natural', etiquetas: ['vegetariano', 'sin-gluten'] }),
  plato({ id: 'picante', categoriaId: 'hamburguesas', precio: 29000, orden: 2, nombre: 'Brasa picante', ingredientes: ['Jalapeños', 'Queso'], picante: 3 }),
  plato({ id: 'clasica', categoriaId: 'hamburguesas', precio: 24000, orden: 1, nombre: 'Clásica de la casa', ingredientes: ['Carne de res', 'Queso cheddar'] }),
  plato({ id: 'vegetal', categoriaId: 'hamburguesas', precio: 25000, orden: 3, nombre: 'Raíz vegetal', ingredientes: ['Garbanzo'], etiquetas: ['vegetariano'] }),
  plato({ id: 'combo', categoriaId: 'hamburguesas', precio: 49900, orden: 4, nombre: 'Combo para dos' }),
];

const ids = (lista: Plato[]) => lista.map((p) => p.id);

describe('normalizar', () => {
  it('quita tildes, eñes, mayúsculas y espacios de sobra', () => {
    expect(normalizar('  Jalapeño   PICANTE ')).toBe('jalapeno picante');
    expect(normalizar('Raíz')).toBe('raiz');
  });
});

describe('búsqueda', () => {
  it('encuentra sin importar tildes ni mayúsculas', () => {
    const buscable = textoBuscable(platos[1], categorias[1]);
    expect(coincideTexto(buscable, 'JALAPENO')).toBeTrue();
    expect(coincideTexto(buscable, 'jalapeño')).toBeTrue();
  });

  it('exige todas las palabras, en cualquier orden', () => {
    const buscable = textoBuscable(platos[2], categorias[1]);
    expect(coincideTexto(buscable, 'cheddar clásica')).toBeTrue();
    expect(coincideTexto(buscable, 'cheddar tocineta')).toBeFalse();
  });

  it('busca también por categoría, etiquetas y picante', () => {
    expect(ids(filtrarPlatos(platos, categorias, { ...FILTROS_VACIOS, texto: 'bebidas' }))).toEqual(['limonada']);
    expect(ids(filtrarPlatos(platos, categorias, { ...FILTROS_VACIOS, texto: 'sin gluten' }))).toEqual(['limonada']);
    expect(ids(filtrarPlatos(platos, categorias, { ...FILTROS_VACIOS, texto: 'picante' }))).toEqual(['picante']);
  });

  it('una búsqueda vacía o con espacios no filtra nada', () => {
    expect(filtrarPlatos(platos, categorias, { ...FILTROS_VACIOS, texto: '   ' }).length).toBe(platos.length);
  });

  it('sin resultados devuelve una lista vacía', () => {
    expect(filtrarPlatos(platos, categorias, { ...FILTROS_VACIOS, texto: 'sushi' })).toEqual([]);
  });
});

describe('filtros', () => {
  it('ordena por categoría y luego por orden del plato', () => {
    expect(ids(filtrarPlatos(platos, categorias, FILTROS_VACIOS))).toEqual(['clasica', 'picante', 'vegetal', 'combo', 'limonada']);
  });

  it('vegetariano', () => {
    expect(ids(filtrarPlatos(platos, categorias, { ...FILTROS_VACIOS, vegetariano: true }))).toEqual(['vegetal', 'limonada']);
  });

  it('picante', () => {
    expect(ids(filtrarPlatos(platos, categorias, { ...FILTROS_VACIOS, picante: true }))).toEqual(['picante']);
  });

  it('sin gluten', () => {
    expect(ids(filtrarPlatos(platos, categorias, { ...FILTROS_VACIOS, sinGluten: true }))).toEqual(['limonada']);
  });

  it('combina filtros y búsqueda (todos deben cumplirse)', () => {
    const f = { ...FILTROS_VACIOS, vegetariano: true, texto: 'garbanzo' };
    expect(ids(filtrarPlatos(platos, categorias, f))).toEqual(['vegetal']);
    expect(filtrarPlatos(platos, categorias, { ...f, sinGluten: true })).toEqual([]);
  });

  it('por rango de precio', () => {
    const rangos = rangosDePrecio([15000, 30000]);
    const filtrar = (precio: string) => ids(filtrarPlatos(platos, categorias, { ...FILTROS_VACIOS, precio }, rangos));
    expect(filtrar('hasta-15000')).toEqual(['limonada']);
    expect(filtrar('15000-30000')).toEqual(['clasica', 'picante', 'vegetal']);
    expect(filtrar('desde-30000')).toEqual(['combo']);
  });

  it('cuenta los filtros activos y detecta si hay alguno', () => {
    expect(hayFiltros(FILTROS_VACIOS)).toBeFalse();
    expect(hayFiltros({ ...FILTROS_VACIOS, texto: 'queso' })).toBeTrue();
    expect(filtrosActivos({ ...FILTROS_VACIOS, texto: 'queso' })).toBe(0);
    expect(filtrosActivos({ ...FILTROS_VACIOS, picante: true, precio: 'hasta-15000' })).toBe(2);
  });
});

describe('rangosDePrecio', () => {
  it('arma etiquetas cortas y límites sin huecos ni solapes', () => {
    const rangos = rangosDePrecio([30000, 15000, 15000]);
    expect(rangos.map((r) => r.etiqueta)).toEqual(['Hasta $15 mil', '$15 a $30 mil', 'Más de $30 mil']);
    expect(enRango(15000, rangos[0])).toBeTrue();
    expect(enRango(15000, rangos[1])).toBeFalse();
    expect(enRango(30000, rangos[1])).toBeTrue();
    expect(enRango(30001, rangos[2])).toBeTrue();
  });

  it('sin cortes no hay filtro de precio', () => {
    expect(rangosDePrecio([])).toEqual([]);
  });
});

describe('agruparPorCategoria', () => {
  it('respeta el orden de las categorías y omite las vacías', () => {
    const grupos = agruparPorCategoria(filtrarPlatos(platos, categorias, FILTROS_VACIOS), categorias);
    expect(grupos.map((g) => g.categoria.id)).toEqual(['hamburguesas', 'bebidas']);
    expect(ids(grupos[0].platos)).toEqual(['clasica', 'picante', 'vegetal', 'combo']);
  });
});
