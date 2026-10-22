import type { Timestamp } from 'firebase/firestore';
import type { Entrega } from '../pedido/pedido';

/**
 * Documentos del Club en Firestore (las reglas de firestore.rules validan cada campo):
 * - clientes/{uid}: el perfil de quien se registra.
 * - pedidos/{id}: los pedidos que un cliente registrado envía por WhatsApp (para sus sellos y para el panel).
 * - cupones/{CODIGO}: los cupones; cupones/{CODIGO}/usos/{uid}, quién ya usó uno de un solo uso.
 * - admins/{correo}: las cuentas que entran al panel (además de `adminEmail`).
 */

export interface Cliente {
  nombre: string;
  /** 10 dígitos, empieza por 3 (celular de Colombia). */
  celular: string;
  /** El de la cuenta (no se puede cambiar desde la página). */
  correo: string;
  /** 'MM-DD' (sin año: no hace falta saber la edad). */
  cumpleanos?: string;
  direccion?: string;
  barrio?: string;
  /** Prueba de lo que autorizó y cuándo (Ley 1581). El admin no las puede cambiar. */
  autorizaciones: {
    /** Tratamiento de datos según la política, en su versión de ese día. Obligatoria para registrarse. */
    datos: { version: string; fecha: Timestamp };
    /** Recibir promociones por WhatsApp o correo. Opcional; se puede retirar. */
    promociones: { aceptada: boolean; fecha: Timestamp };
  };
  /** Sellos acumulados (solo el admin los cambia: al marcar un pedido entregado o a mano). */
  sellos: number;
  pedidosEntregados: number;
  ultimoPedidoEn?: Timestamp;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

export type EstadoPedido = 'enviado' | 'entregado' | 'cancelado';

export interface LineaPedido {
  nombre: string;
  detalle: string;
  cantidad: number;
  /** Precio por unidad. */
  precio: number;
}

export interface DescuentoPedido {
  tipo: 'club' | 'cupon';
  /** 'Descuento del Club (10 %)', 'Cupón HALLOWEEN' */
  concepto: string;
  valor: number;
  cupon?: string;
}

export interface PedidoGuardado {
  uid: string;
  /** Copia del nombre y el celular al enviar (para el panel, aunque luego cambien en el perfil). */
  cliente: { nombre: string; celular: string };
  lineas: LineaPedido[];
  subtotal: number;
  descuento?: DescuentoPedido;
  /** Premio de la tarjeta de sellos que pidió canjear. */
  premio?: string;
  total: number;
  entrega: Entrega;
  direccion?: string;
  nota?: string;
  estado: EstadoPedido;
  creadoEn: Timestamp;
  /** Cuándo el admin lo marcó entregado o cancelado. */
  cerradoEn?: Timestamp;
}

/** Un cupón: su id en Firestore es el código ('HALLOWEEN10'). */
export interface Cupon {
  codigo: string;
  /** Lo que ve el cliente: '10 % en tu pedido de Halloween'. */
  descripcion: string;
  tipo: 'porcentaje' | 'valor';
  /** Porcentaje (1 a 100) o pesos. */
  valor: number;
  /** Pedido mínimo en pesos (0: sin mínimo), sin contar los productos en promo. */
  minimo: number;
  /** 'AAAA-MM-DD', ambas incluidas, en hora de Colombia. */
  desde: string;
  hasta: string;
  activo: boolean;
  /** Solo para clientes registrados. */
  soloClub: boolean;
  /** Una vez por cliente (exige cuenta: así se puede comprobar). */
  unUso: boolean;
}
