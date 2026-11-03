/**
 * Una celda de CSV para Excel. Nombre, dirección y barrio los escribe el cliente: un texto que empieza por = + - @
 * Excel lo toma como fórmula (p. ej. =HYPERLINK(…)), así que va con un apóstrofo delante (se ve, pero no se ejecuta).
 */
export function celdaCsv(valor: unknown): string {
  return `"${String(valor ?? '').replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;
}

/** Filas separadas por punto y coma (como lo abre Excel en español), con BOM para que respete las tildes. */
export function csv(filas: unknown[][]): string {
  return '﻿' + filas.map((fila) => fila.map(celdaCsv).join(';')).join('\r\n');
}
