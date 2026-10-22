import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { CartaService } from '../carta/carta.service';
import { CLIENTE } from '../config/cliente';
import { formatoPrecio } from '../menu/precio';
import { formatoCelular } from '../negocio/contacto';
import { PaginaComponent } from './pagina.component';
import { irAlFragmento } from './politica-datos.component';

/**
 * Términos y condiciones: pedidos por WhatsApp, promociones, cupones y el Club (Ley 1480 de 2011, Estatuto del
 * Consumidor). Las condiciones del Club salen de la carta (las que el admin tenga puestas en el panel).
 * Es una base razonable, pero conviene que la revise un abogado antes de lanzar.
 */
@Component({
  selector: 'app-terminos',
  imports: [PaginaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pagina actual="terminos">
      <article class="texto-legal mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        <p class="rotulo" data-num="§">{{ c.nombre }}</p>
        <h1 class="mt-4 font-display text-5xl font-extrabold uppercase leading-[0.9] text-papel-50 sm:text-6xl">Términos y condiciones</h1>
        <p class="mt-4 text-sm text-papel-400">Vigentes desde el {{ c.legal.vigenteDesde }}.</p>

        <h2 id="alcance">1. Quiénes somos y qué cubren</h2>
        <p>
          Estos términos aplican a la página de {{ c.legal.razonSocial ?? c.nombre }}@if (c.legal.nit) { (NIT/CC {{ c.legal.nit }})},
          {{ direccion }}: el menú, los pedidos que se arman aquí y se envían por WhatsApp, las promociones, los cupones
          y el {{ club().nombre }}. Al usar la página los aceptas. El tratamiento de tus datos está en la
          <a href="/politica-de-datos">política de datos</a>.
        </p>

        <h2 id="menu">2. Menú, precios y disponibilidad</h2>
        <ul>
          <li>Los precios están en pesos colombianos e incluyen los impuestos que apliquen. El valor del domicilio no está incluido: se informa en el chat.</li>
          <li>Las fotos son ilustrativas: la presentación puede variar un poco.</li>
          <li>Los productos están sujetos a disponibilidad. Lo que se agota se marca en la carta; si algo se acaba después de que envías tu pedido, te lo decimos en el chat antes de confirmarlo.</li>
          <li>Si un precio de la página tiene un error evidente, te lo informamos antes de confirmar el pedido y decides si sigues.</li>
        </ul>

        <h2 id="pedidos">3. Pedidos por WhatsApp</h2>
        <ul>
          <li>La página arma el pedido y lo deja listo como mensaje de WhatsApp. <strong>El pedido queda confirmado cuando te respondemos en el chat</strong>, con la dirección, el valor del domicilio, el medio de pago y el tiempo de entrega.</li>
          <li>La página no cobra ni guarda datos de pago.</li>
          @if (c.contacto.whatsapp.numero) {
            <li>Nuestro único WhatsApp para pedidos es el {{ whatsapp }}.</li>
          }
        </ul>

        <h2 id="promociones">4. Promociones</h2>
        <ul>
          <li>Cada promoción dice su vigencia y sus condiciones en la página. Fuera de sus fechas no aplica.</li>
          <li>Salvo que la promoción diga otra cosa: vale hasta agotar existencias, no se acumula con otros descuentos ni cupones y no se cambia por dinero.</li>
        </ul>

        <h2 id="cupones">5. Cupones</h2>
        <ul>
          <li>Un cupón es un código de descuento con vigencia y condiciones propias (por ejemplo, un pedido mínimo, ser del {{ club().nombre }} o usarse una sola vez por cliente). La página las dice al aplicarlo.</li>
          <li>Se usa un cupón por pedido. No se acumula con el descuento del {{ club().nombre }} ni aplica sobre los productos en promoción.</li>
          <li>No se cambia por dinero. Lo confirmamos en el chat junto con el pedido.</li>
        </ul>

        <h2 id="club">6. {{ club().nombre }}</h2>
        <ul>
          <li>Registrarse es <strong>voluntario y gratis</strong>. No es necesario para ver el menú ni para pedir.</li>
          @if (club().activo) {
            @if (club().descuento.activo && club().descuento.porcentaje > 0) {
              <li>
                <strong>Descuento:</strong> {{ club().descuento.porcentaje }} % para clientes registrados
                {{ club().descuento.soloPrimerPedido ? 'en su primer pedido hecho desde su cuenta' : 'en cada pedido hecho desde su cuenta' }}@if (club().descuento.minimo > 0) {, con un pedido mínimo de {{ precio(club().descuento.minimo) }}}.
                Aplica sobre los productos que no están en promoción.
              </li>
            }
            @if (club().sellos.activo) {
              <li>
                <strong>Tarjeta de sellos:</strong> ganas un sello por cada pedido hecho desde tu cuenta que te entregamos.
                Al juntar {{ club().sellos.meta }} sellos recibes {{ premio() }}, que pides marcándolo en tu siguiente pedido. Los
                pedidos cancelados no suman sellos.
              </li>
            }
          } @else {
            <li>Por ahora el {{ club().nombre }} no tiene beneficios activos. Cuando los tenga, sus condiciones estarán aquí.</li>
          }
          <li>Los sellos y beneficios son personales, no se transfieren ni se cambian por dinero, y no se acumulan con otras promociones salvo que se diga.</li>
          <li>Podemos cambiar o terminar los beneficios del {{ club().nombre }} avisando en esta página. Los sellos que ya tengas se respetan durante los 30 días siguientes al aviso.</li>
          <li>Puedes eliminar tu cuenta cuando quieras desde <a href="/cuenta">Mi cuenta</a>; con ella se pierden los sellos.</li>
          <li>Si detectamos un uso abusivo (cuentas duplicadas o pedidos falsos), podemos anular los beneficios de esa cuenta.</li>
        </ul>

        <h2 id="garantia">7. Calidad, garantía y retracto</h2>
        <ul>
          <li>Si tu pedido llega incompleto o con un problema, escríbenos por WhatsApp lo antes posible, si puedes con una foto, y lo solucionamos.</li>
          <li>Por tratarse de alimentos perecederos preparados al momento, no aplica el derecho de retracto (Ley 1480 de 2011, artículo 47).</li>
        </ul>

        <h2 id="pqr">8. Preguntas, quejas y reclamos</h2>
        <p>
          Escríbenos por WhatsApp@if (c.legal.correo) {, al correo <a [href]="'mailto:' + c.legal.correo">{{ c.legal.correo }}</a>}
          o por mensaje directo en nuestras redes. Si no quedas conforme, puedes acudir a la Superintendencia de Industria y Comercio (SIC).
        </p>

        <h2 id="ley">9. Ley aplicable</h2>
        <p>Estos términos se rigen por las leyes de Colombia. Si los cambiamos, publicaremos la nueva versión en esta página con su fecha de vigencia.</p>
      </article>
    </app-pagina>
  `,
})
export class TerminosComponent {
  private readonly cartas = inject(CartaService);
  protected readonly c = CLIENTE;
  protected readonly club = computed(() => this.cartas.carta().club);
  /** "una hamburguesa La Clásica sola": el premio en minúscula, para la frase. */
  protected readonly premio = computed(() => {
    const p = this.club().sellos.premio.trim();
    return p ? p.charAt(0).toLowerCase() + p.slice(1) : 'un premio';
  });
  protected readonly precio = formatoPrecio;
  protected readonly whatsapp = CLIENTE.contacto.whatsapp.numero ? formatoCelular(CLIENTE.contacto.whatsapp.numero) : '';
  protected readonly direccion = [CLIENTE.ubicacion.direccion, CLIENTE.ubicacion.barrio, CLIENTE.ubicacion.ciudad].filter(Boolean).join(', ');

  constructor() {
    inject(Title).setTitle(`Términos y condiciones · ${CLIENTE.nombre}`);
    // Las condiciones del Club que tenga puestas el admin.
    void this.cartas.actualizar();
    irAlFragmento();
  }
}
