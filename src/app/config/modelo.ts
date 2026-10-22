import type { NombreSticker } from '../marca/stickers';
import type { TonoPlato } from '../menu/menu.model';

/**
 * Todo lo que cambia de una hamburguesería a otra. Para otro cliente: copia clientes/rootfire.ts,
 * cambia los datos y apúntalo en cliente.ts. Luego `npm run preparar` (lo hace solo `npm start` y
 * `npm run build`) escribe los colores, el SEO, el manifiesto y robots.txt a partir de esta config.
 *
 * Este archivo y los de clientes/ los leen también los scripts de Node: usa solo `import type`.
 */

/** Canales RGB separados por espacio ('221 44 27'), para poder usar opacidad en Tailwind. */
export type Rgb = string;
export type Tono = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type Escala = Record<Tono, Rgb>;

export interface Fuente {
  /** Nombre con el que se declara la fuente (@font-face). */
  familia: string;
  /** Archivo woff2 en /public. */
  archivo: string;
  /** Rango de pesos del archivo variable ('600 800'). */
  pesos: string;
  /** Fuentes del sistema mientras carga. */
  respaldo: string;
}

export interface TemaCliente {
  /** Fondos oscuros, tarjetas y bordes (950 es el fondo de la página). */
  fondo: Escala & { 950: Rgb };
  /** Crema y kraft: texto principal y superficies de papel. */
  papel: Escala & { 50: Rgb };
  /** Color de la marca. */
  primario: Escala;
  secundario: Escala;
  /** Botones principales, precios y resaltados. */
  destello: Escala;
  /** Vegetariano y detalles "de raíz". */
  fresco: Escala;
  /** Texto sobre botones de destello y sobre botones de primario (cuidar el contraste AA). */
  sobreDestello: Rgb;
  sobrePrimario: Rgb;
  /** Color de la barra del navegador en celular (hex). */
  colorNavegador: string;
  /**
   * Colores de las tarjetas por plato (hex). `texto` y `acento` deben tener contraste AA (4,5:1) con `fondo`;
   * `titulo` va en letra grande (3:1 basta).
   */
  tonos: Record<TonoPlato, { fondo: string; titulo: string; texto: string; acento: string }>;
  fuentes: { display: Fuente; texto: Fuente };
}

export interface Turno {
  /** 'HH:mm' en hora de Colombia. */
  abre: string;
  /** 'HH:mm'. Si es menor o igual que `abre`, cierra al día siguiente (p. ej. abre 17:00, cierra 01:00). */
  cierra: string;
}

/**
 * Horario por día, de domingo (0) a sábado (6):
 * - lista de turnos: abre en esas horas;
 * - lista vacía: cerrado;
 * - null: ese día atiende, pero la hora está por confirmar.
 */
export type HorarioSemana = [
  Turno[] | null,
  Turno[] | null,
  Turno[] | null,
  Turno[] | null,
  Turno[] | null,
  Turno[] | null,
  Turno[] | null,
];

/**
 * Promoción o banner de temporada. Se crean y cambian desde el panel (Admin → Promos y banners), con el afiche
 * subido desde ahí. La de la config (`promocion`) es la primera que se carga en Firestore. Fuera de sus fechas,
 * o apagada, no sale nada.
 */
export interface Promocion {
  /** Nombre del archivo del afiche y lo que recuerda el navegador para no repetir la ventana ('halloween-2026'). */
  id: string;
  /** Rótulo corto: 'Promo de octubre'. */
  etiqueta: string;
  /** Frase del afiche, encima del título. */
  antetitulo?: string;
  /** Lo que se ofrece: '2 Ron & Bacon'. */
  titulo: string;
  /** En pesos, sin decimales. */
  precio?: number;
  /** Qué trae, en una frase: 'Son 2 combos: cada uno con papas y gaseosa.' */
  detalle?: string;
  /** Condiciones, tal cual las del afiche. */
  nota?: string;
  /** Plato de la promo (id del menú): su tarjeta lleva el sello de la promo y su foto ilustra el banner de la carta. */
  platoId?: string;
  /** Cuántas unidades de ese plato trae la promo (para sugerirla en el pedido). */
  cantidad?: number;
  /** Fechas 'AAAA-MM-DD' en hora de Colombia, ambas incluidas. */
  vigencia: { desde: string; hasta: string };
  /**
   * Afiche: ruta en /public (lo genera `npm run promo`) o dirección de Storage (subido desde el panel).
   * `alt` describe la imagen; los datos van en los textos de arriba.
   */
  afiche: { src: string; ancho: number; alto: number; pequena?: { src: string; ancho: number }; alt: string };
  /** Mensaje del botón de WhatsApp. */
  mensajeWhatsApp?: string;
  /** false: guardada pero apagada (no sale aunque esté en fechas). Sin definir cuenta como encendida. */
  activa?: boolean;
}

/**
 * Club Rootfire: registrarse es opcional. Quien se registra puede tener un descuento y una tarjeta de sellos.
 * Lo cambia el admin en el panel (Admin → Club); estos son los valores con los que arranca.
 */
export interface AjustesClub {
  /** Apagado: la página no invita a registrarse ni aplica beneficios (las cuentas que ya existen siguen ahí). */
  activo: boolean;
  nombre: string;
  /** Descuento para clientes registrados, sobre los productos que no son promo. */
  descuento: { activo: boolean; porcentaje: number; soloPrimerPedido: boolean; /** Pedido mínimo en pesos (0: sin mínimo). */ minimo: number };
  /** Tarjeta de sellos: un sello por pedido entregado (lo marca el admin); al juntar `meta`, el premio. */
  sellos: { activo: boolean; meta: number; premio: string };
}

/** Datos del responsable del tratamiento de datos (políticas y términos). */
export interface DatosLegales {
  /** Razón social o nombre del titular. Sin ella se usa el nombre del negocio. */
  razonSocial?: string;
  /** NIT o cédula del responsable. */
  nit?: string;
  /** Correo para consultas y reclamos sobre datos personales. */
  correo?: string;
  /** Fecha desde la que rigen la política y los términos (texto: '22 de octubre de 2026'). */
  vigenteDesde: string;
  /**
   * Versión de la política que acepta quien se registra ('2026-10-22'). Si cambian las finalidades, súbela:
   * queda guardada con cada autorización como prueba de qué se aceptó.
   */
  version: string;
}

/** Configuración web de Firebase (no es secreta: la protegen las reglas). Firebase → Configuración del proyecto → Tus apps. */
export interface ConfigFirebase {
  projectId: string;
  apiKey?: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export type RedSocial = 'instagram' | 'facebook' | 'tiktok' | 'whatsapp';

export interface EnlaceRed {
  red: Exclude<RedSocial, 'whatsapp'>;
  usuario: string;
  url: string;
}

export interface ConfigCliente {
  id: string;
  nombre: string;
  nombreCorto: string;
  /** Frase de la marca. */
  lema: string;
  /** Frase grande del cierre (pie de página). */
  cierre: string;
  /** Descripción para buscadores y vistas previas (150 a 160 caracteres). */
  descripcion: string;
  sitio: {
    /** Dirección final, sin '/' al final. La usan el SEO, el sitemap y el QR. */
    url: string;
    idioma: string;
    /** Tipo de cocina para los datos estructurados. */
    cocina: string[];
    /** Rango de precios para Google ('$', '$$'…). */
    rangoPrecios?: string;
  };
  inicio: {
    antetitulo: string;
    /** Titular grande; `destacado` va resaltado en la segunda línea. */
    titulo: string;
    destacado: string;
    subtitulo: string;
  };
  nosotros: {
    /** Frase grande de la sección. */
    cita: string;
    /** Párrafos de la historia. Vacío: la sección muestra solo la cita y los datos. */
    historia: string[];
    datos: { titulo: string; texto: string; sticker?: NombreSticker }[];
    /** Palabras de la cinta que se desplaza. */
    marquesina: string[];
  };
  ubicacion: {
    /** Dirección completa. Vacía: se muestra `referencia`. */
    direccion: string;
    barrio?: string;
    /** Texto corto mientras no hay dirección (p. ej. 'Calle 49'). */
    referencia: string;
    ciudad: string;
    departamento: string;
    /** src del iframe de Google Maps (Compartir → Insertar un mapa). Vacío: tarjeta sin mapa. */
    mapaEmbedUrl: string;
    /** Enlace "Cómo llegar". */
    mapaUrl: string;
    coordenadas?: { latitud: number; longitud: number };
    /** Sticker que marca el local sobre el mapa (en lugar del pin de Google). */
    marcador?: NombreSticker;
  };
  horario: HorarioSemana;
  /**
   * Horario de los festivos de Colombia, caigan el día que caigan (se calculan solos: negocio/festivos.ts).
   * Lista vacía: los festivos se cierra. Sin definir: un festivo se atiende como cualquier otro día de la semana.
   */
  horarioFestivos?: Turno[];
  /**
   * Promoción con la que arranca la página. Cuando el admin carga la carta en Firestore, las promos pasan a
   * cambiarse desde el panel y esta ya no se usa.
   */
  promocion?: Promocion;
  /** Valores iniciales del Club (el admin los cambia en el panel). */
  club: AjustesClub;
  legal: DatosLegales;
  /** Cuenta dueña del panel. Debe coincidir con esCorreoAdmin() en firestore.rules y storage.rules. */
  adminEmail: string;
  contacto: {
    /**
     * Botón de WhatsApp. Con `pedidos`, la página deja armar el pedido y lo envía como mensaje de WhatsApp
     * (sin pagos ni cuentas: el negocio lo confirma en el chat).
     */
    whatsapp: { activo: boolean; numero: string; mensaje: string; pedidos?: boolean };
    telefono?: string;
  };
  redes: EnlaceRed[];
  /** Firma del desarrollador en el pie: "Diseño y desarrollo · ProjectRyann". */
  firma: { etiqueta: string; nombre: string; url?: string };
  /**
   * Proyecto de Firebase. Con solo `projectId` la página funciona con el menú de config/menu.ts; con la
   * configuración web completa (`apiKey`, `appId`…) se encienden la carta editable, el Club y el panel.
   */
  firebase: ConfigFirebase;
  tema: TemaCliente;
}
