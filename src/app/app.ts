import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { DetalleService } from './menu/detalle.service';
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Sin @defer a propósito: se probó y partía el código compartido en 6 archivos pequeños que comprimen
  // peor (85 → 88 KB transferidos). Para quien abre desde el QR con datos móviles rinden más 2 archivos.
  template: `
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
    <app-avisos />
    <app-menu-impreso />
  `,
})
export class App {
  constructor() {
    const detalle = inject(DetalleService);
    // Enlace compartido (?plato=id): abre el detalle cuando la página ya está pintada.
    afterNextRender(() => detalle.abrirDesdeUrl());
  }
}
