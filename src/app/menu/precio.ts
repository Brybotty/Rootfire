const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * 28000 → '$ 28.000' (formato es-CO). El espacio es de no separación (U+00A0): el signo nunca queda
 * solo al final de una línea.
 */
export function formatoPrecio(valor: number): string {
  return PESOS.format(Math.round(valor));
}

/** Adicionales: 4000 → '+ $ 4.000'. */
export function formatoAdicional(valor: number): string {
  return `+ ${formatoPrecio(valor)}`;
}
