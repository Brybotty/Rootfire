/** Deja solo los dígitos (quita espacios, guiones y el '+'). */
export function soloDigitos(telefono: string): string {
  return telefono.replace(/\D/g, '');
}

/** Enlace de WhatsApp. Un celular colombiano de 10 dígitos recibe el indicativo 57. */
export function enlaceWhatsApp(telefono: string, mensaje = ''): string {
  const numero = soloDigitos(telefono);
  const conIndicativo = numero.length === 10 && numero.startsWith('3') ? `57${numero}` : numero;
  return `https://wa.me/${conIndicativo}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
}

/** "573059083313" o "3059083313" → "305 908 3313". Si no es un celular colombiano, lo deja igual. */
export function formatoCelular(telefono: string): string {
  const digitos = soloDigitos(telefono);
  const numero = digitos.length === 12 && digitos.startsWith('57') ? digitos.slice(2) : digitos;
  return numero.length === 10 ? `${numero.slice(0, 3)} ${numero.slice(3, 6)} ${numero.slice(6)}` : telefono;
}
