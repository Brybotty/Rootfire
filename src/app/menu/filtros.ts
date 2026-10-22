import type { Categoria, EtiquetaPlato, Plato } from './menu.model';

export interface RangoPrecio {
  id: string;
  /** Excluyente (el rango empieza después de este valor). */
  desde: number;
  /** Incluyente. null = sin tope. */
  hasta: number | null;
  etiqueta: string;
}

export interface Filtros {
  texto: string;
  vegetariano: boolean;
  picante: boolean;
  sinGluten: boolean;
  /** id del rango de precio; null = cualquier precio. */
  precio: string | null;
}

export const FILTROS_VACIOS: Filtros = { texto: '', vegetariano: false, picante: false, sinGluten: false, precio: null };

export interface GrupoCategoria {
  categoria: Categoria;
  platos: Plato[];
}

/** Minúsculas, sin tildes ni espacios de sobra: "Jalapeño  Picante" → "jalapeno picante". */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const MILES = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

/** 15000 → '$15 mil' (etiquetas cortas para los filtros en celular). */
export function valorCorto(valor: number): string {
  return valor >= 1000 ? `$${MILES.format(valor / 1000)} mil` : `$${valor}`;
}

/** [15000, 30000] → Hasta $15 mil · $15 a $30 mil · Más de $30 mil. */
export function rangosDePrecio(cortes: number[]): RangoPrecio[] {
  const ordenados = [...new Set(cortes)].filter((c) => c > 0).sort((a, b) => a - b);
  if (ordenados.length === 0) return [];
  const rangos: RangoPrecio[] = [{ id: `hasta-${ordenados[0]}`, desde: -1, hasta: ordenados[0], etiqueta: `Hasta ${valorCorto(ordenados[0])}` }];
  for (let i = 1; i < ordenados.length; i++) {
    const [a, b] = [ordenados[i - 1], ordenados[i]];
    rangos.push({ id: `${a}-${b}`, desde: a, hasta: b, etiqueta: `${valorCorto(a).replace(' mil', '')} a ${valorCorto(b)}` });
  }
  const ultimo = ordenados[ordenados.length - 1];
  rangos.push({ id: `desde-${ultimo}`, desde: ultimo, hasta: null, etiqueta: `Más de ${valorCorto(ultimo)}` });
  return rangos;
}

const TEXTO_ETIQUETA: Record<EtiquetaPlato, string> = {
  vegetariano: 'vegetariano vegetariana veggie',
  'sin-gluten': 'sin gluten',
  nuevo: 'nuevo nueva',
  favorito: 'favorito favorita',
};

/** Todo el texto en el que se busca un plato, ya normalizado. */
export function textoBuscable(plato: Plato, categoria?: Categoria): string {
  return normalizar(
    [
      plato.nombre,
      plato.descripcion,
      plato.frase ?? '',
      ...plato.ingredientes,
      ...(plato.incluye ?? []),
      categoria?.nombre ?? '',
      ...(plato.etiquetas ?? []).map((e) => TEXTO_ETIQUETA[e]),
      plato.picante ? 'picante' : '',
    ].join(' '),
  );
}

/** Todas las palabras de la búsqueda deben aparecer (en cualquier orden). */
export function coincideTexto(buscable: string, consulta: string): boolean {
  const palabras = normalizar(consulta).split(' ').filter(Boolean);
  return palabras.every((p) => buscable.includes(p));
}

export function esVegetariano(plato: Plato): boolean {
  return !!plato.etiquetas?.includes('vegetariano');
}

export function esSinGluten(plato: Plato): boolean {
  return !!plato.etiquetas?.includes('sin-gluten');
}

export function esPicante(plato: Plato): boolean {
  return (plato.picante ?? 0) > 0;
}

export function enRango(precio: number, rango: RangoPrecio): boolean {
  return precio > rango.desde && (rango.hasta === null || precio <= rango.hasta);
}

export function hayFiltros(f: Filtros): boolean {
  return !!normalizar(f.texto) || f.vegetariano || f.picante || f.sinGluten || f.precio !== null;
}

/** Cuántos filtros (sin contar la búsqueda) están activos. */
export function filtrosActivos(f: Filtros): number {
  return [f.vegetariano, f.picante, f.sinGluten, f.precio !== null].filter(Boolean).length;
}

/** Platos que pasan la búsqueda y los filtros, en el orden de la carta. */
export function filtrarPlatos(platos: Plato[], categorias: Categoria[], filtros: Filtros, rangos: RangoPrecio[] = []): Plato[] {
  const porId = new Map(categorias.map((c) => [c.id, c]));
  const rango = filtros.precio ? rangos.find((r) => r.id === filtros.precio) : undefined;
  return ordenarPlatos(platos, categorias).filter((plato) => {
    if (filtros.vegetariano && !esVegetariano(plato)) return false;
    if (filtros.picante && !esPicante(plato)) return false;
    if (filtros.sinGluten && !esSinGluten(plato)) return false;
    if (rango && !enRango(plato.precio, rango)) return false;
    if (filtros.texto && !coincideTexto(textoBuscable(plato, porId.get(plato.categoriaId)), filtros.texto)) return false;
    return true;
  });
}

/** Por orden de categoría y luego por orden del plato. */
export function ordenarPlatos(platos: Plato[], categorias: Categoria[]): Plato[] {
  const ordenCategoria = new Map(categorias.map((c) => [c.id, c.orden]));
  return [...platos].sort(
    (a, b) =>
      (ordenCategoria.get(a.categoriaId) ?? 99) - (ordenCategoria.get(b.categoriaId) ?? 99) || a.orden - b.orden,
  );
}

/** Agrupa por categoría, en orden y sin categorías vacías. */
export function agruparPorCategoria(platos: Plato[], categorias: Categoria[]): GrupoCategoria[] {
  return [...categorias]
    .sort((a, b) => a.orden - b.orden)
    .map((categoria) => ({ categoria, platos: platos.filter((p) => p.categoriaId === categoria.id) }))
    .filter((g) => g.platos.length > 0);
}
