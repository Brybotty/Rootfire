import type { ConfigCliente } from './modelo';
import { ROOTFIRE } from './clientes/rootfire';

/** Cliente activo de este build. Para otra hamburguesería, crea su archivo en clientes/ y cambia esta línea. */
export const CLIENTE: ConfigCliente = ROOTFIRE;
