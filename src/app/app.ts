import { ChangeDetectionStrategy, Component, type Type, afterNextRender, inject, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { CartaService } from './carta/carta.service';
import { ClubService } from './club/club.service';
import { AvisoCookiesComponent } from './legal/aviso-cookies.component';
import { DetalleService } from './menu/detalle.service';
import { CARGAR, paginaDe } from './paginas';
import { AvisosComponent } from './pwa/avisos.component';
import { BarraInferiorComponent } from './secciones/barra-inferior.component';
import { BarraSuperiorComponent } from './secciones/barra-superior.component';
import { CartaComponent } from './secciones/carta/carta.component';
import { CasaComponent } from './secciones/casa.component';
import { DetallePlatoComponent } from './secciones/detalle-plato.component';
import { InicioComponent } from './secciones/inicio.component';
import { MenuImpresoComponent } from './secciones/menu-impreso.component';
import { PedidoBarraComponent } from './secciones/pedido/pedido-barra.component';
import { PedidoComponent } from './secciones/pedido/pedido.component';
import { PieComponent } from './secciones/pie.component';
import { PromoComponent } from './secciones/promo.component';
import { VisitanosComponent } from './secciones/visitanos.component';

@Component({
  selector: 'app-root',
  imports: [
    NgComponentOutlet,
    BarraSuperiorComponent,
    InicioComponent,
    CartaComponent,
    CasaComponent,
    VisitanosComponent,
    PieComponent,
    BarraInferiorComponent,
    DetallePlatoComponent,
    PromoComponent,
    PedidoBarraComponent,
    PedidoComponent,
    MenuImpresoComponent,
    AvisosComponent,
    AvisoCookiesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Sin @defer a propósito: se probó y partía el código compartido en 6 archivos pequeños que comprimen
  // peor (85 → 88 KB transferidos). Para quien abre desde el QR con datos móviles rinden más 2 archivos.
  // Las otras páginas (políticas, cuenta y panel) sí van aparte: casi nadie las abre desde la mesa.
  template: `
    @if (pagina === 'menu') {
      <app-barra-superior />
      <main class="no-imprimir">
        <app-inicio />
        <app-carta />
        <app-casa />
        <app-visitanos />
      </main>
      <app-pie />
      <app-barra-inferior />
      <app-detalle-plato />
      <app-promo />
      <app-pedido-barra />
      <app-pedido />
      <app-menu-impreso />
    } @else if (otra(); as componente) {
      <ng-container *ngComponentOutlet="componente" />
    } @else {
      <div class="carga-inicial" role="status" aria-label="Cargando">
        <img src="favicon.svg" width="64" height="64" alt="" />
      </div>
    }
    <app-avisos />
    <app-aviso-cookies />
  `,
})
export class App {
  readonly pagina = paginaDe(location.pathname);
  /** Componente de la página que no es el menú, cuando termina de bajar. */
  readonly otra = signal<Type<unknown> | null>(null);

  constructor() {
    const carta = inject(CartaService);
    if (this.pagina === 'menu') {
      const detalle = inject(DetalleService);
      const club = inject(ClubService);
      afterNextRender(() => {
        // Enlace compartido (?plato=id): abre el detalle cuando la página ya está pintada.
        detalle.abrirDesdeUrl();
        // Precios, platos y promos que el admin haya cambiado (la página ya se ve con la copia anterior).
        void carta.actualizar();
        // Con sesión del Club en este navegador: su perfil, para el descuento y los sellos del pedido.
        void club.iniciar();
      });
    } else {
      CARGAR[this.pagina]().then((componente) => this.otra.set(componente));
    }
  }
}
