import type { Adicional, Foto, Menu } from '../menu/menu.model';

/**
 * Menú de Rootfire Burgers, tomado de su carta impresa (2026-10-01).
 * Los ingredientes salen de las descripciones de la carta: no se agregó nada que la carta no diga.
 * Sin el gramaje de la carne (la carta dice 150 g y 120 g): el cliente pidió quitarlo el 2026-10-09.
 * Las fotos son las de su diseñadora (public/platos). TODO: alérgenos, solo si el negocio los confirma.
 *
 * Es la carta con la que arranca la página y la que el admin carga en Firestore la primera vez (Admin → Menú).
 * Desde ahí los precios y los platos se cambian en el panel; este archivo queda como respaldo sin conexión.
 */

/** Fotos de la diseñadora, recortadas (scripts/assets/extraer.py las saca del archivo del menú). */
const foto = (plato: string, alt: string): Foto => ({
  src: `platos/${plato}.webp`,
  ancho: 960,
  alto: 768,
  pequena: { src: `platos/${plato}-480.webp`, ancho: 480 },
  recortada: true,
  alt,
});

/** Las adiciones de la carta: se muestran en su sección y también en el detalle de cada hamburguesa (`adicionesDe`). */
const ADICIONES: Adicional[] = [
  { nombre: 'Papas a la francesa', precio: 4000 },
  { nombre: 'Aritos de cebolla x5', precio: 4000 },
  { nombre: 'Aritos de cebolla x10', precio: 7000 },
];

export const MENU: Menu = {
  moneda: 'COP',
  rangosPrecio: [10000, 20000],
  notaCombo: 'Los combos incluyen papas a la francesa o aritos de cebolla x5 y una Coca Cola de 250 ml.',
  acompanamientosCombo: ['Papas a la francesa', 'Aritos de cebolla x5'],
  adicionesDe: 'adiciones',
  categorias: [
    { id: 'hamburguesas', nombre: 'Hamburguesas', descripcion: 'Sola o en combo.', icono: 'hamburguesa', orden: 1, estilo: 'cartel' },
    { id: 'adiciones', nombre: 'Adiciones', icono: 'papas', orden: 2, estilo: 'lista', tono: 'verde-oscuro' },
    { id: 'bebidas', nombre: 'Bebidas', icono: 'bebida', orden: 3, estilo: 'lista', tono: 'verde-oscuro' },
  ],
  platos: [
    // ——— Hamburguesas (en el orden de la carta) ———
    {
      id: 'ron-y-bacon',
      foto: foto('ron-y-bacon', 'Hamburguesa Ron & Bacon con tocineta, lechuga, pepinillos y queso derretido'),
      categoriaId: 'hamburguesas',
      nombre: 'Ron & Bacon',
      descripcion:
        'La intensidad de la tocineta caramelizada al ron se une a la carne Angus y doble textura de queso, con pepinillos y lechuga para el equilibrio perfecto.',
      frase: '¡Simplemente brutal!',
      ingredientes: ['Carne Angus', 'Tocineta caramelizada al ron', 'Doble textura de queso', 'Pepinillos', 'Lechuga'],
      precio: 25000,
      precioCombo: 32000,
      conAdiciones: true,
      tono: 'verde',
      orden: 1,
      ilustracion: { tipo: 'hamburguesa', pan: 'brioche', capas: ['carne', 'queso', 'mermelada-tocineta', 'tocineta', 'pepinillos', 'lechuga'] },
    },
    {
      id: 'la-clasica',
      foto: foto('la-clasica', 'Hamburguesa La Clásica con lechuga, tomate, pepinillos y queso'),
      categoriaId: 'hamburguesas',
      nombre: 'La Clásica',
      descripcion: 'Carne a la parrilla, queso, lechuga, tomate, pepinillos y nuestra salsa de la casa.',
      frase: 'Porque lo clásico nunca tiene que ser aburrido.',
      ingredientes: ['Carne a la parrilla', 'Queso', 'Lechuga', 'Tomate', 'Pepinillos', 'Salsa de la casa'],
      precio: 19000,
      precioCombo: 26000,
      conAdiciones: true,
      tono: 'amarillo',
      orden: 2,
      ilustracion: { tipo: 'hamburguesa', pan: 'brioche', capas: ['carne', 'queso', 'salsa', 'pepinillos', 'tomate', 'lechuga'] },
    },
    {
      id: 'root-burger',
      foto: foto('root-burger', 'Root Burger con mermelada de tocineta, cheddar fundido y queso crema'),
      categoriaId: 'hamburguesas',
      nombre: 'Root Burger',
      descripcion:
        'Carne Angus combinada con la mermelada de tocineta al ron artesanal, cheddar fundido y queso crema suave en un pan brioche.',
      frase: 'Nuestra creación estrella.',
      ingredientes: ['Pan brioche', 'Carne Angus', 'Mermelada de tocineta al ron artesanal', 'Cheddar fundido', 'Queso crema'],
      precio: 20000,
      precioCombo: 27000,
      conAdiciones: true,
      destacado: true,
      tono: 'naranja',
      orden: 3,
      ilustracion: { tipo: 'hamburguesa', pan: 'brioche', capas: ['carne', 'queso', 'mermelada-tocineta', 'queso-crema'] },
    },
    {
      id: 'la-casual',
      foto: foto('la-casual', 'Hamburguesa La Casual con lechuga, cebolla caramelizada y cheddar'),
      categoriaId: 'hamburguesas',
      nombre: 'La Casual',
      descripcion:
        'Pan artesanal con carne Angus jugosa, lechuga crocante y cebolla dulce caramelizada, rematada con cheddar fundido y nuestra salsa secreta.',
      frase: '¡Un mordisco irresistible!',
      ingredientes: ['Pan artesanal', 'Carne Angus', 'Lechuga crocante', 'Cebolla dulce caramelizada', 'Cheddar fundido', 'Salsa secreta'],
      precio: 15000,
      precioCombo: 22000,
      conAdiciones: true,
      tono: 'rojo',
      orden: 4,
      ilustracion: { tipo: 'hamburguesa', pan: 'brioche', capas: ['carne', 'queso', 'cebolla-caramelizada', 'salsa', 'lechuga'] },
    },
    {
      id: 'la-madurita',
      foto: foto('la-madurita', 'Hamburguesa La Madurita con plátano maduro, queso derretido y tocineta'),
      categoriaId: 'hamburguesas',
      nombre: 'La Madurita',
      descripcion:
        'Jugosa carne Angus con el toque dulce del plátano maduro caramelizado, queso derretido, tocineta crujiente y nuestra salsa secreta.',
      frase: '¡El perfecto sabor criollo!',
      ingredientes: ['Carne Angus', 'Plátano maduro caramelizado', 'Queso derretido', 'Tocineta crujiente', 'Salsa secreta'],
      precio: 23000,
      precioCombo: 30000,
      conAdiciones: true,
      tono: 'verde',
      orden: 5,
      ilustracion: { tipo: 'hamburguesa', pan: 'brioche', capas: ['carne', 'queso', 'maduro', 'tocineta', 'salsa'] },
    },

    // ——— Adiciones ———
    ...ADICIONES.map((a, i) => ({
      id: ['papas-francesa', 'aritos-x5', 'aritos-x10'][i],
      categoriaId: 'adiciones',
      nombre: a.nombre,
      descripcion: '',
      ingredientes: [],
      precio: a.precio,
      orden: i + 1,
      ilustracion: i === 0 ? ({ tipo: 'papas', estilo: 'francesa' } as const) : ({ tipo: 'aros', cantidad: i === 1 ? 5 : 10 } as const),
    })),

    // ——— Bebidas ———
    {
      id: 'coca-cola',
      categoriaId: 'bebidas',
      nombre: 'Coca Cola 250 ml',
      descripcion: '',
      ingredientes: [],
      precio: 3000,
      orden: 1,
      ilustracion: { tipo: 'bebida', estilo: 'botella', color: '#3B160C' },
    },
    {
      id: 'quatro',
      categoriaId: 'bebidas',
      nombre: 'Quatro 250 ml',
      descripcion: '',
      ingredientes: [],
      precio: 3000,
      orden: 2,
      ilustracion: { tipo: 'bebida', estilo: 'botella', color: '#E8DE7A' },
    },
  ],
};
