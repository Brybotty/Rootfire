import type { AjustesClub, Promocion } from '../config/modelo';
import type { Adicional, Categoria, Menu, Plato } from '../menu/menu.model';

/**
 * La carta pública: todo lo que la página necesita y el admin cambia desde el panel. Vive en un solo documento de
 * Firestore (`publico/carta`): una lectura por visita, sin cargar Firebase (firebase/rest.ts).
 */
export interface Carta {
  menu: Menu;
  /** Promos y banners de temporada. Sale la primera encendida y en fechas (negocio/promocion.ts). */
  promociones: Promocion[];
  club: AjustesClub;
  /** ISO de la última vez que se guardó desde el panel (informativo). */
  actualizadaEn?: string;
}

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const esTexto = (v: unknown): v is string => typeof v === 'string';
const esNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const textos = (v: unknown): string[] => lista(v).filter(esTexto);

function categoria(v: unknown): Categoria | null {
  if (!esObjeto(v) || !esTexto(v['id']) || !esTexto(v['nombre'])) return null;
  return { ...(v as unknown as Categoria), orden: esNumero(v['orden']) ? v['orden'] : 0, icono: esTexto(v['icono']) ? (v['icono'] as Categoria['icono']) : 'hamburguesa' };
}

function plato(v: unknown): Plato | null {
  if (!esObjeto(v) || !esTexto(v['id']) || !esTexto(v['categoriaId']) || !esTexto(v['nombre']) || !esNumero(v['precio'])) return null;
  return {
    ...(v as unknown as Plato),
    descripcion: esTexto(v['descripcion']) ? v['descripcion'] : '',
    ingredientes: textos(v['ingredientes']),
    orden: esNumero(v['orden']) ? v['orden'] : 0,
    precioCombo: esNumero(v['precioCombo']) && v['precioCombo'] > 0 ? v['precioCombo'] : undefined,
  };
}

function promocion(v: unknown): Promocion | null {
  if (!esObjeto(v) || !esTexto(v['id']) || !esTexto(v['titulo']) || !esTexto(v['etiqueta'])) return null;
  const vigencia = v['vigencia'];
  const afiche = v['afiche'];
  if (!esObjeto(vigencia) || !esTexto(vigencia['desde']) || !esTexto(vigencia['hasta'])) return null;
  if (!esObjeto(afiche) || !esTexto(afiche['src']) || !esNumero(afiche['ancho']) || !esNumero(afiche['alto'])) return null;
  return v as unknown as Promocion;
}

function club(v: unknown, base: AjustesClub): AjustesClub {
  if (!esObjeto(v)) return base;
  const d = esObjeto(v['descuento']) ? v['descuento'] : {};
  const s = esObjeto(v['sellos']) ? v['sellos'] : {};
  const si = (x: unknown, otro: boolean) => (typeof x === 'boolean' ? x : otro);
  return {
    activo: si(v['activo'], base.activo),
    nombre: esTexto(v['nombre']) && v['nombre'].trim() ? v['nombre'] : base.nombre,
    descuento: {
      activo: si(d['activo'], base.descuento.activo),
      porcentaje: esNumero(d['porcentaje']) ? Math.min(100, Math.max(0, d['porcentaje'])) : base.descuento.porcentaje,
      soloPrimerPedido: si(d['soloPrimerPedido'], base.descuento.soloPrimerPedido),
      minimo: esNumero(d['minimo']) ? Math.max(0, d['minimo']) : base.descuento.minimo,
    },
    sellos: {
      activo: si(s['activo'], base.sellos.activo),
      meta: esNumero(s['meta']) && s['meta'] >= 1 ? Math.round(s['meta']) : base.sellos.meta,
      premio: esTexto(s['premio']) ? s['premio'] : base.sellos.premio,
    },
  };
}

/**
 * Revisa lo que llega de Firestore antes de pintarlo: descarta lo que no tiene forma de plato, categoría o promo
 * (en vez de romper la página) y completa lo que falte con `respaldo`. Sin menú utilizable devuelve null.
 */
export function normalizarCarta(datos: unknown, respaldo: Carta): Carta | null {
  if (!esObjeto(datos) || !esObjeto(datos['menu'])) return null;
  const m = datos['menu'];
  const categorias = lista(m['categorias']).map(categoria).filter((c): c is Categoria => !!c);
  const platos = lista(m['platos']).map(plato).filter((p): p is Plato => !!p);
  if (!categorias.length) return null;
  const rangos = lista(m['rangosPrecio']).filter(esNumero);
  return {
    menu: {
      ...(m as unknown as Menu),
      moneda: 'COP',
      rangosPrecio: rangos.length ? rangos : respaldo.menu.rangosPrecio,
      acompanamientosCombo: textos(m['acompanamientosCombo']),
      categorias,
      platos,
    },
    promociones: lista(datos['promociones']).map(promocion).filter((p): p is Promocion => !!p),
    club: club(datos['club'], respaldo.club),
    actualizadaEn: esTexto(datos['actualizadaEn']) ? datos['actualizadaEn'] : undefined,
  };
}

/**
 * El menú tal como se muestra: sin lo oculto ni las categorías que quedan vacías, y con las adiciones de cada plato
 * sacadas de la categoría `adicionesDe` (el precio de una adición se cambia en un solo sitio).
 */
export function menuParaVer(menu: Menu): Menu {
  const platos = menu.platos.filter((p) => !p.oculto);
  const adiciones: Adicional[] = menu.adicionesDe
    ? platos
        .filter((p) => p.categoriaId === menu.adicionesDe && p.estado !== 'agotado')
        .sort((a, b) => a.orden - b.orden)
        .map((p) => ({ nombre: p.nombre, precio: p.precio }))
    : [];
  const conPlatos = new Set(platos.map((p) => p.categoriaId));
  return {
    ...menu,
    categorias: menu.categorias.filter((c) => conPlatos.has(c.id)),
    platos: platos.map((p) => (p.conAdiciones && adiciones.length ? { ...p, adicionales: adiciones } : p)),
  };
}
