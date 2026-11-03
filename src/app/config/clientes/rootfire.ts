import type { ConfigCliente, Turno } from '../modelo';

/** De 5:30 p. m. a 10:30 p. m., el mismo horario todos los días que se atiende (dato del usuario, 2026-10-08). */
const TURNO: Turno[] = [{ abre: '17:30', cierra: '22:30' }];

/**
 * Rootfire Burgers (@rootfire_burgers), Cali.
 * Lo confirmado viene del usuario, de su Instagram (afiche "tiene nueva pinta", camiseta "Jugamos con fuego"),
 * de su carta (precios, WhatsApp, TikTok, "El fuego no es para tibios") y de los archivos de su diseñadora
 * (logotipo, sello, stickers y paleta: recursos/originales).
 * El ícono de la página es la cabecita de la mascota (src/app/marca/mascota.ts): al usuario le gusta más que el
 * fueguito oficial y sigue el mouse con los ojos.
 * Lo marcado con TODO falta pedirlo al cliente: no se inventa.
 */
export const ROOTFIRE: ConfigCliente = {
  id: 'rootfire',
  nombre: 'Rootfire Burgers',
  nombreCorto: 'Rootfire',
  // De la camiseta del equipo.
  lema: 'Jugamos con fuego',
  // Contraportada de su carta.
  cierre: 'El fuego no es para tibios',
  descripcion:
    'Rootfire Burgers en Cali: hamburguesas Angus a domicilio o en el local de Fenalco Kennedy (Calle 49 # 25-06). Jueves a domingo y festivos, de 5:30 a 10:30 p. m.',
  sitio: {
    // Dominio propio desde el 2026-11-03 (así, "burguers"; comprado en Hostinger, conectado a Firebase Hosting).
    // rootfire-burgers.web.app sirve lo mismo, así que los QR impresos antes con esa dirección siguen sirviendo.
    url: 'https://rootfireburguers.com',
    idioma: 'es-CO',
    cocina: ['Hamburguesas', 'Comida rápida'],
  },
  inicio: {
    antetitulo: 'Cali · Jueves a domingo y festivos',
    titulo: 'Jugamos',
    destacado: 'con fuego.',
    // Texto del usuario (2026-10-03).
    subtitulo: '¿Buscando la mejor burger de Cali? Te la mandamos a domicilio o te esperamos en el local de jueves a domingo.',
  },
  nosotros: {
    // Texto de su afiche en Instagram.
    cita: 'Rootfire tiene nueva pinta, pero el fuego sigue siendo el mismo.',
    // TODO: historia del negocio (cómo empezó, quién está detrás, qué los hace distintos). Vacío = no se muestra.
    historia: [],
    // Textos del cliente (2026-10-09) para "Nuestro local" y "Tenemos domicilios".
    datos: [
      { titulo: 'Jueves a domingo', texto: 'Y festivos. Prendemos la parrilla de 5:30 a 10:30 p. m.', sticker: 'mascota-parrilla' },
      { titulo: 'Nuestro local', texto: 'Estamos ubicados en la Calle 49 Nº 25-06, Fenalco Kennedy.', sticker: 'mascota-senala' },
      { titulo: 'Tenemos domicilios', texto: 'Te llevamos tu burger favorita a la puerta de tu casa.', sticker: 'mascota-moto' },
    ],
    marquesina: ['El fuego no es para tibios', 'Rootfire Burgers', 'Jugamos con fuego', 'Jueves a domingo'],
  },
  ubicacion: {
    direccion: 'Calle 49 Nº 25-06',
    barrio: 'Fenalco Kennedy',
    referencia: 'Calle 49',
    ciudad: 'Cali',
    departamento: 'Valle del Cauca',
    // src del iframe que pasó el usuario (ficha "RootFire Burgers" en Google Maps).
    mapaEmbedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3982.6392808412734!2d-76.499702!3d3.4376320000000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e30a70031224aa7%3A0xbd5b93451de75754!2sRootFire%20Burgers!5e0!3m2!1ses-419!2sco!4v1791009398831!5m2!1ses-419!2sco',
    // La misma ficha (el cid sale del identificador 0xbd5b93451de75754 del iframe).
    mapaUrl: 'https://www.google.com/maps?cid=13644661421112776532',
    // Del iframe (!3d latitud, !2d longitud).
    coordenadas: { latitud: 3.437632, longitud: -76.499702 },
    // Sticker que marca el local sobre el mapa.
    marcador: 'llama',
  },
  // De domingo a sábado: atienden de jueves a domingo, y también los festivos (caigan el día que caigan).
  horario: [TURNO, [], [], [], TURNO, TURNO, TURNO],
  horarioFestivos: TURNO,
  // Promo del mes. Los textos son los del afiche de su diseñadora (recursos/promos/halloween-2026.png);
  // el afiche dice "2 Ron y Bacon": aquí va con el nombre de la carta.
  promocion: {
    id: 'halloween-2026',
    etiqueta: 'Promo de octubre',
    antetitulo: 'No hay truco, solo trato',
    titulo: '2 Ron & Bacon',
    precio: 58900,
    // Confirmado por el usuario (2026-10-09): son 2 combos, con papas y gaseosa.
    detalle: 'Son 2 combos: cada uno con papas y gaseosa.',
    nota: 'Promo de Halloween, válida todo octubre. Disponible en punto físico y domicilios.',
    platoId: 'ron-y-bacon',
    cantidad: 2,
    vigencia: { desde: '2026-10-01', hasta: '2026-10-31' },
    afiche: {
      src: 'promos/halloween-2026.webp',
      ancho: 1080,
      alto: 1920,
      pequena: { src: 'promos/halloween-2026-720.webp', ancho: 720 },
      alt: 'Afiche de Halloween: dos hamburguesas Ron & Bacon, papas y dos Coca-Cola saliendo de un caldero que humea, con el sello de Rootfire.',
    },
    mensajeWhatsApp: 'Hola, Rootfire. Quiero la promo de Halloween: 2 Ron & Bacon en combo por $58.900.',
  },
  contacto: {
    // De su carta: 305 908 3313. Desde el 2026-10-09 la página deja armar el pedido y lo manda por WhatsApp
    // (pedido del usuario); no hay pagos ni cuentas.
    whatsapp: { activo: true, numero: '573059083313', mensaje: 'Hola, Rootfire. Tengo una pregunta sobre el menú: ', pedidos: true },
  },
  redes: [
    { red: 'instagram', usuario: 'rootfire_burgers', url: 'https://www.instagram.com/rootfire_burgers/' },
    { red: 'tiktok', usuario: 'rootfire.burgers', url: 'https://www.tiktok.com/@rootfire.burgers' },
  ],
  firma: { etiqueta: 'Diseño y desarrollo', nombre: 'ProjectRyann' },
  // Valores sugeridos y apagados: el Club no se anuncia hasta que el admin lo encienda (Admin → Club) con las
  // condiciones que decida el negocio.
  club: {
    activo: false,
    nombre: 'Club Rootfire',
    descuento: { activo: true, porcentaje: 10, soloPrimerPedido: true, minimo: 0 },
    sellos: { activo: true, meta: 8, premio: 'Una hamburguesa La Clásica sola' },
  },
  // TODO: pedir al cliente razón social, NIT y un correo para datos personales. Mientras tanto las políticas
  // usan el nombre comercial, la dirección y el WhatsApp.
  legal: {
    razonSocial: undefined,
    nit: undefined,
    correo: undefined,
    vigenteDesde: '22 de octubre de 2026',
    version: '2026-10-22',
  },
  // La misma cuenta dueña del panel de El Acicale. Debe coincidir con esCorreoAdmin() en firestore.rules y storage.rules.
  adminEmail: 'ortizgonzalesbryanalexander1@gmail.com',
  // Configuración web de la app "rootfire_burgers" (Firebase → Configuración del proyecto → Tus apps). No es secreta:
  // viaja en el JavaScript de la página; lo que protege los datos son firestore.rules y storage.rules. Sin `apiKey`
  // la página sigue con el menú de config/menu.ts y no hay Club ni panel.
  // authDomain va en el dominio firebaseapp.com del proyecto: es la única dirección de vuelta que el cliente OAuth de
  // Google trae autorizada de fábrica. Con rootfire-burgers.web.app, Google respondía redirect_uri_mismatch y nadie podía
  // entrar con Google. Como se entra con ventana emergente (signInWithPopup), el bloqueo de cookies de terceros no lo afecta.
  firebase: {
    projectId: 'rootfire-burgers',
    apiKey: 'AIzaSyDxpqJH6CAs3DsvZRE3cEsQescFjK9BoJ4',
    appId: '1:830895731461:web:158cb9e0e7d3b9e2d47d6c',
    messagingSenderId: '830895731461',
    authDomain: 'rootfire-burgers.firebaseapp.com',
    storageBucket: 'rootfire-burgers.firebasestorage.app',
  },
  tema: {
    // Base oscura (carbón cálido) con la paleta oficial de la marca encima:
    // amarillo #FFCB00, naranja #FF6006, rojo #D11813, verde #8CBD00, verde oscuro #005225 y crema #FAE6CB.
    fondo: {
      100: '234 223 209', 200: '212 195 176', 300: '179 158 138', 400: '140 117 98', 500: '100 80 63',
      600: '68 52 40', 700: '46 34 26', 800: '33 24 18', 900: '23 16 12', 950: '14 9 7',
    },
    // Crema oficial (100) y tonos kraft.
    papel: {
      50: '255 248 238', 100: '250 230 203', 200: '242 213 174', 300: '227 189 138', 400: '207 160 102',
      500: '173 127 69', 600: '135 98 52', 700: '97 70 39', 800: '64 47 27', 900: '37 27 16',
    },
    // Rojo oficial en 500.
    primario: {
      100: '255 225 222', 200: '255 186 180', 300: '255 138 128', 400: '242 73 63', 500: '209 24 19',
      600: '176 19 15', 700: '138 16 13', 800: '101 14 11', 900: '64 10 8',
    },
    // Naranja oficial en 500.
    secundario: {
      100: '255 231 214', 200: '255 201 163', 300: '255 163 102', 400: '255 129 54', 500: '255 96 6',
      600: '217 76 0', 700: '168 59 0', 800: '122 44 4', 900: '77 29 6',
    },
    // Amarillo oficial en 400.
    destello: {
      100: '255 246 209', 200: '255 234 153', 300: '255 219 87', 400: '255 203 0', 500: '230 180 0',
      600: '191 149 0', 700: '143 111 0', 800: '102 80 0', 900: '64 50 0',
    },
    // Verde oficial en 500.
    fresco: {
      100: '241 248 214', 200: '221 238 163', 300: '195 224 98', 400: '166 209 31', 500: '140 189 0',
      600: '111 150 0', 700: '84 113 0', 800: '59 80 0', 900: '37 51 0',
    },
    // Texto casi negro sobre el amarillo (13:1) y blanco sobre el rojo (5,4:1).
    sobreDestello: '14 9 7',
    sobrePrimario: '255 255 255',
    colorNavegador: '#0E0907',
    // Tarjetas de color de su carta, con la paleta oficial. Contraste revisado: texto ≥ 4,5:1 y título ≥ 3:1.
    // El naranja de las tarjetas va un punto más profundo que el oficial (#FF6006) para que el título crema se lea.
    tonos: {
      verde: { fondo: '#8CBD00', titulo: '#005225', texto: '#063B1B', acento: '#003A1A' },
      amarillo: { fondo: '#FFCB00', titulo: '#D11813', texto: '#8A100D', acento: '#A3120E' },
      // Naranja y rojo: el texto va del color del nombre (pedido del usuario, 2026-10-09). Queda en 3,2:1 y 3,6:1,
      // por debajo del 4,5:1 recomendado para texto corrido; antes eran #2A0F05 y #FFFFFF.
      naranja: { fondo: '#F25A04', titulo: '#FFF8EE', texto: '#FFF8EE', acento: '#FFF8EE' },
      rojo: { fondo: '#D11813', titulo: '#FFCB00', texto: '#FFCB00', acento: '#FFCB00' },
      'verde-oscuro': { fondo: '#005225', titulo: '#A6D11F', texto: '#FAE6CB', acento: '#A6D11F' },
    },
    fuentes: {
      display: {
        familia: 'Bricolage Condensada',
        archivo: 'fonts/bricolage-condensada.woff2',
        pesos: '600 800',
        respaldo: '"Arial Narrow", "Roboto Condensed", Impact, sans-serif',
      },
      texto: {
        familia: 'Figtree',
        archivo: 'fonts/figtree.woff2',
        pesos: '300 900',
        respaldo: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      },
    },
  },
};
