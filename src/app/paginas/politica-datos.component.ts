import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { CLIENTE } from '../config/cliente';
import { formatoCelular } from '../negocio/contacto';
import { PaginaComponent } from './pagina.component';

/**
 * Política de tratamiento de datos personales (Ley 1581 de 2012 y Decreto 1377 de 2013, compilado en el Decreto
 * 1074 de 2015), con la sección de cookies. La misma base de El Acicale, ajustada a Rootfire: pedidos por WhatsApp
 * y el Club (registro opcional). Los datos del responsable salen de `legal` en la config del cliente.
 * Es una base razonable, pero conviene que la revise un abogado antes de lanzar.
 */
@Component({
  selector: 'app-politica-datos',
  imports: [PaginaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-pagina actual="politica">
      <article class="texto-legal mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        <p class="rotulo" data-num="§">{{ c.nombre }}</p>
        <h1 class="mt-4 font-display text-5xl font-extrabold uppercase leading-[0.9] text-papel-50 sm:text-6xl">Política de tratamiento de datos personales y cookies</h1>
        <p class="mt-4 text-sm text-papel-400">Vigente desde el {{ legal.vigenteDesde }}.</p>

        <div class="tarjeta mt-8 p-5">
          <p class="text-sm">
            En {{ c.nombre }} cuidamos la información que nos confías. Para ver el menú y pedir por WhatsApp no necesitas
            darnos ningún dato. Si decides registrarte en el {{ club }}, aquí te contamos qué datos usamos, para qué y cómo
            puedes consultarlos, corregirlos o pedir que los borremos, conforme a la Ley 1581 de 2012 y sus decretos
            reglamentarios.
          </p>
        </div>

        <h2 id="responsable">1. Responsable del tratamiento</h2>
        <ul>
          <li><strong>Responsable:</strong> {{ legal.razonSocial ?? c.nombre }}@if (legal.nit) {, identificado con NIT/CC {{ legal.nit }}}.</li>
          <li><strong>Dirección:</strong> {{ direccion }}.</li>
          @if (legal.correo) {
            <li><strong>Correo:</strong> <a [href]="'mailto:' + legal.correo">{{ legal.correo }}</a></li>
          }
          @if (whatsapp) {
            <li><strong>WhatsApp:</strong> <a [href]="'https://wa.me/' + c.contacto.whatsapp.numero" target="_blank" rel="noopener">{{ whatsapp }}</a></li>
          }
          @for (red of c.redes; track red.url) {
            <li><strong class="capitalize">{{ red.red }}:</strong> <a [href]="red.url" target="_blank" rel="noopener">&#64;{{ red.usuario }}</a> (mensaje directo).</li>
          }
        </ul>

        <h2 id="datos">2. Qué datos recolectamos</h2>
        <ul>
          <li><strong>Si solo miras el menú o pides por WhatsApp sin registrarte:</strong> no guardamos datos tuyos en nuestros sistemas. El pedido se arma en tu navegador y nos lo envías tú por WhatsApp, donde conversamos la dirección y el pago.</li>
          <li><strong>Si te registras en el {{ club }} (opcional):</strong> tu nombre, número de celular y correo electrónico; si quieres, el día y mes de tu cumpleaños y la dirección y el barrio donde recibes tus domicilios; y las autorizaciones que nos das, con su fecha.</li>
          <li><strong>Pedidos hechos con tu cuenta:</strong> productos, valores, descuentos y cupones aplicados, forma de entrega, la nota que escribas, fecha y estado del pedido, y tus sellos y premios del {{ club }}.</li>
          <li><strong>Navegación:</strong> lo necesario para que la página funcione (ver el punto 8). No usamos cookies de publicidad ni de medición.</li>
        </ul>
        <p>No recolectamos datos sensibles (salud, origen étnico, creencias, etc.) ni datos de tarjetas o cuentas bancarias: la página no cobra.</p>

        <h2 id="finalidades">3. Para qué los usamos</h2>
        <ul>
          <li>Crear y administrar tu cuenta del {{ club }}: reconocer tus pedidos y aplicarte los descuentos, cupones, sellos y premios que tengas.</li>
          <li>Preparar y entregar tus pedidos y domicilios, y comunicarnos contigo por WhatsApp, llamada o correo sobre ellos.</li>
          <li>Atender tus preguntas, quejas, reclamos y solicitudes de garantía.</li>
          <li>Darte un detalle en tu cumpleaños, si nos diste la fecha.</li>
          <li>Conocer qué se vende más y mejorar el menú, con cifras internas que no compartimos.</li>
          <li>Cumplir obligaciones legales, contables y tributarias.</li>
          <li><strong>Enviarte promociones y novedades</strong> por WhatsApp o correo, <strong>solo si lo autorizas</strong> en una casilla aparte (no es obligatoria para registrarte). Puedes retirar esa autorización cuando quieras desde "Mi cuenta" o escribiéndonos.</li>
        </ul>

        <h2 id="terceros">4. Con quién los compartimos</h2>
        <p>No vendemos ni alquilamos tus datos. Solo los compartimos con quienes nos ayudan a prestarte el servicio:</p>
        <ul>
          <li><strong>Google (Firebase):</strong> aloja la página, las cuentas, la base de datos y las imágenes, y envía los correos para verificar tu cuenta o cambiar tu contraseña. Trata los datos por nuestra cuenta y con medidas de seguridad. Sus servidores pueden estar fuera de Colombia, lo que implica una transmisión internacional de datos a un proveedor con estándares adecuados de protección.</li>
          <li><strong>WhatsApp (Meta):</strong> cuando nos escribes o nos envías tu pedido, la conversación pasa por WhatsApp y se rige también por sus propias políticas.</li>
          <li><strong>Autoridades:</strong> cuando una norma o una orden judicial lo exija.</li>
        </ul>

        <h2 id="derechos">5. Tus derechos</h2>
        <p>Como titular de los datos puedes:</p>
        <ul>
          <li>Conocer, actualizar y rectificar tus datos.</li>
          <li>Pedir prueba de la autorización que nos diste.</li>
          <li>Saber qué uso le hemos dado a tus datos.</li>
          <li>Revocar la autorización y pedir que borremos tus datos, cuando no tengamos un deber legal o contractual de conservarlos.</li>
          <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) después de haber hecho tu consulta o reclamo con nosotros.</li>
          <li>Acceder gratis a tus datos.</li>
        </ul>

        <h2 id="procedimiento">6. Cómo ejercerlos</h2>
        <p>
          Desde <a href="/cuenta">Mi cuenta</a> puedes ver y corregir tus datos, retirar la autorización de promociones,
          descargar una copia de tu información y eliminar tu cuenta. También puedes escribirnos por cualquiera de los
          canales del punto 1 con tu nombre, tu celular o correo y lo que necesitas.
        </p>
        <ul>
          <li><strong>Consultas</strong> (saber qué datos tenemos y cómo los usamos): te respondemos en máximo <strong>10 días hábiles</strong>. Si necesitamos más tiempo te avisamos, y en ningún caso pasaremos de 5 días hábiles adicionales.</li>
          <li><strong>Reclamos</strong> (corregir, actualizar, borrar o revocar la autorización): incluye tu identificación, la descripción de lo que pides, tu dirección o correo de respuesta y los documentos que quieras hacer valer. Te respondemos en máximo <strong>15 días hábiles</strong>, prorrogables hasta 8 días hábiles más, avisándote el motivo.</li>
        </ul>

        <h2 id="seguridad">7. Seguridad y conservación</h2>
        <p>Tus datos viajan cifrados (HTTPS) y solo acceden a ellos las personas que los necesitan: cada cliente ve únicamente su cuenta y sus pedidos, y solo el personal autorizado de {{ c.nombre }} ve los de los demás.</p>
        <p>Guardamos tus datos mientras tengas tu cuenta y durante el tiempo que exijan las normas contables, tributarias y de protección al consumidor. Si eliminas tu cuenta, borramos tu perfil y tus pedidos de nuestros sistemas.</p>

        <h2 id="cookies">8. Cookies y contenido de terceros</h2>
        <p>Una cookie es un dato pequeño que una página guarda en tu navegador. Aquí usamos lo siguiente:</p>
        <ul>
          <li><strong>Necesarias (siempre activas):</strong> el pedido que estás armando (solo por ese día), tu sesión si entras al {{ club }} (Firebase, de Google), una copia de la carta para que abra rápido y sin conexión, y que ya viste el aviso de cookies y la ventana de la promo. Sin ellas la página no funciona, por eso no piden permiso. Se guardan en tu navegador y no las usamos para publicidad.</li>
          <li><strong>Mapa de Google (siempre visible):</strong> el mapa interactivo de cómo llegar, en la sección "Visítanos", lo sirve Google, que puede guardar sus propias cookies y conocer tu dirección IP. Se carga al bajar hasta esa sección, sin pedir permiso.</li>
        </ul>
        <p>No usamos cookies de publicidad ni herramientas de medición o seguimiento.</p>
        <p>
          Puedes borrar las cookies cuando quieras desde los ajustes de tu navegador; si borras las necesarias, se pierde
          el pedido que tenías armado y tendrás que iniciar sesión de nuevo.
        </p>

        <h2 id="autorizacion">9. Autorización</h2>
        <p>
          Al crear tu cuenta marcas la casilla con la que nos autorizas a tratar tus datos según esta política; guardamos
          la fecha y la versión de la política que aceptaste como prueba. La autorización para recibir promociones es
          aparte y opcional.
        </p>
        <p>El {{ club }} es para mayores de edad. Si eres menor, regístrate solo con la autorización de tu padre, madre o representante legal.</p>

        <h2 id="cambios">10. Cambios a esta política</h2>
        <p>Si cambiamos algo importante, lo publicaremos en esta página con la nueva fecha de vigencia y, si el cambio afecta las finalidades, te pediremos una nueva autorización.</p>
      </article>
    </app-pagina>
  `,
})
export class PoliticaDatosComponent {
  protected readonly c = CLIENTE;
  protected readonly legal = CLIENTE.legal;
  protected readonly club = CLIENTE.club.nombre;
  protected readonly whatsapp = CLIENTE.contacto.whatsapp.numero ? formatoCelular(CLIENTE.contacto.whatsapp.numero) : '';
  protected readonly direccion = [CLIENTE.ubicacion.direccion, CLIENTE.ubicacion.barrio, CLIENTE.ubicacion.ciudad].filter(Boolean).join(', ');

  constructor() {
    inject(Title).setTitle(`Política de datos y cookies · ${CLIENTE.nombre}`);
    irAlFragmento();
  }
}

/**
 * Con la página ya pintada, baja a la sección del enlace (#cookies), que no existía cuando cargó la dirección.
 * Se llama desde el constructor del componente.
 */
export function irAlFragmento() {
  const id = location.hash.slice(1);
  if (id) afterNextRender(() => document.getElementById(id)?.scrollIntoView());
}
