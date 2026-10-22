/**
 * Modelo del menú. Son objetos planos (solo textos, números y listas) para poder guardarlos tal cual
 * en Firestore más adelante: una colección `categorias` y otra `platos` con `categoriaId`.
 * Lo leen también los scripts de Node: usa solo `import type`.
 */

export type IconoCategoria = 'hamburguesa' | 'combo' | 'papas' | 'bebida' | 'postre' | 'compartir';

/**
 * Colores de tarjeta (como la carta impresa de Rootfire: una hamburguesa por color).
 * Los valores de cada tono están en la config del cliente (tema.tonos).
 */
export type TonoPlato = 'verde' | 'amarillo' | 'naranja' | 'rojo' | 'verde-oscuro';

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  icono: IconoCategoria;
  orden: number;
  /**
   * - normal: tarjetas (fila con miniatura en celular).
   * - cartel: tarjetas de color grandes con la imagen saliendo por arriba (usa el `tono` de cada plato).
   * - combo: tarjeta tipo ticket de papel kraft.
   * - lista: filas compactas "nombre ··· precio" en un panel (adiciones, bebidas).
   */
  estilo?: 'normal' | 'cartel' | 'combo' | 'lista';
  /** Color del panel en el estilo lista. */
  tono?: TonoPlato;
}

export type EtiquetaPlato = 'vegetariano' | 'sin-gluten' | 'nuevo' | 'favorito';

export interface Adicional {
  nombre: string;
  precio: number;
}

export interface Foto {
  /** Ruta en /public (WebP), p. ej. 'platos/root-burger.webp'. */
  src: string;
  ancho: number;
  alto: number;
  /** Versión pequeña para celular (se arma un srcset con las dos). */
  pequena?: { src: string; ancho: number };
  /** Foto recortada con fondo transparente: se muestra completa, sin recortarla al marco. */
  recortada?: boolean;
  alt?: string;
}

/** Capas de las ilustraciones de hamburguesa, de abajo hacia arriba. */
export type CapaHamburguesa =
  | 'carne'
  | 'pollo'
  | 'vegetal'
  | 'queso'
  | 'queso-crema'
  | 'tocineta'
  | 'mermelada-tocineta'
  | 'lechuga'
  | 'tomate'
  | 'cebolla'
  | 'cebolla-caramelizada'
  | 'jalapeno'
  | 'pepinillos'
  | 'maduro'
  | 'huevo'
  | 'salsa';

/** 'lechuga': envuelta en hojas de lechuga, sin pan. */
export type TipoPan = 'brioche' | 'ajonjoli' | 'negro' | 'lechuga';

export type Ilustracion =
  | { tipo: 'hamburguesa'; capas: CapaHamburguesa[]; pan?: TipoPan }
  | { tipo: 'combo'; capas: CapaHamburguesa[]; cantidad?: 1 | 2; pan?: TipoPan }
  | { tipo: 'papas'; estilo?: 'francesa' | 'cascos' | 'cargadas' }
  | { tipo: 'aros'; cantidad?: 5 | 10 }
  /** botella: genérica, sin marcas; `color` es el del líquido. */
  | { tipo: 'bebida'; estilo: 'gaseosa' | 'limonada' | 'malteada' | 'agua' | 'botella'; color?: string }
  | { tipo: 'postre'; estilo: 'brownie' | 'helado' };

export interface Plato {
  id: string;
  categoriaId: string;
  nombre: string;
  descripcion: string;
  /** Remate de la descripción, en negrilla (p. ej. "¡Simplemente brutal!"). */
  frase?: string;
  ingredientes: string[];
  /** En pesos colombianos, sin decimales. Si hay `precioCombo`, es el precio "sola". */
  precio: number;
  /** Precio "en combo" (lo que incluye el combo va en `Menu.notaCombo`). */
  precioCombo?: number;
  etiquetas?: EtiquetaPlato[];
  /** 0 = nada, 1 a 3 = nivel de picante. */
  picante?: 0 | 1 | 2 | 3;
  /** Solo si el negocio los confirma. */
  alergenos?: string[];
  adicionales?: Adicional[];
  /** Combos: lo que trae. */
  incluye?: string[];
  estado?: 'disponible' | 'agotado';
  /** "Solo por tiempo limitado". Con `hasta` ('AAAA-MM-DD') se muestra la fecha. */
  tiempoLimitado?: { hasta?: string };
  /** Aparece arriba, en "Destacados" (con uno solo: "La estrella de la casa"). */
  destacado?: boolean;
  /** Color de la tarjeta en las categorías con estilo cartel. */
  tono?: TonoPlato;
  orden: number;
  /** Foto real. Sin foto se dibuja la ilustración. */
  foto?: Foto;
  ilustracion?: Ilustracion;
  /** Plato de ejemplo para la demo: se marca en la página y no va a los datos para Google. */
  ejemplo?: boolean;
}

export interface Menu {
  moneda: 'COP';
  /** Cortes de los filtros de precio (p. ej. [10000, 20000] → "Hasta $10 mil", "$10 a $20 mil", "Más de $20 mil"). */
  rangosPrecio: number[];
  /** Qué incluye el combo (se muestra junto a los precios "en combo"). */
  notaCombo?: string;
  /** Acompañamientos entre los que se elige al pedir en combo (el primero es el que sale marcado). */
  acompanamientosCombo?: string[];
  categorias: Categoria[];
  platos: Plato[];
}
