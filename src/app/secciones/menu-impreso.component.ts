import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { agruparPorCategoria } from '../menu/filtros';
import type { Plato } from '../menu/menu.model';
import { MenuService } from '../menu/menu.service';
import { formatoPrecio } from '../menu/precio';
import { LogotipoComponent } from '../marca/logotipo.component';
import { MascotaComponent } from '../marca/mascota.component';
import { formatoCelular } from '../negocio/contacto';
import { NegocioService } from '../negocio/negocio.service';

/** La carta completa para imprimir o guardar en PDF (no se ve en pantalla). Sin filtros. */
@Component({
  selector: 'app-menu-impreso',
  imports: [LogotipoComponent, MascotaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'solo-impresion', 'aria-hidden': 'true' },
  template: `
    <div class="impreso">
      <header class="cabecera">
        <app-mascota class="mascota" />
        <app-logotipo forma="linea" class="logo" etiqueta="" />
        <div class="lema">
          <strong>Menú</strong>
          <span>{{ c.lema }}</span>
        </div>
      </header>

      <div class="columnas">
        @for (g of grupos(); track g.categoria.id) {
          <section class="categoria">
            <h2>{{ g.categoria.nombre }}</h2>
            @for (p of g.platos; track p.id) {
              <article class="plato">
                <div class="fila">
                  <h3>{{ p.nombre }}@if (marcas(p)) {<small> {{ marcas(p) }}</small>}</h3>
                  <span class="puntos"></span>
                  <span class="precio">{{ precio(p) }}</span>
                </div>
                @if (p.incluye?.length || p.descripcion) {
                  <p>{{ p.incluye?.length ? p.incluye!.join(' · ') : p.descripcion }}@if (p.frase) {<em> {{ p.frase }}</em>}</p>
                }
              </article>
            }
          </section>
        }
      </div>

      <footer class="pie">
        @if (menu.notaCombo()) {
          <p><strong>{{ menu.notaCombo() }}</strong></p>
        }
        <p>{{ leyenda() }}Precios en pesos colombianos.</p>
        @if (whatsapp) {
          <p>WhatsApp {{ whatsapp }}</p>
        }
        <p>{{ sitio }} · Instagram {{ instagram }}</p>
        @if (menu.hayEjemplos()) {
          <p class="aviso">* Menú de demostración: los platos marcados con * son de ejemplo.</p>
        }
      </footer>
    </div>
  `,
  styles: `
    .impreso { font-family: var(--fuente-texto); color: #1b120d; font-size: 10pt; line-height: 1.35; }
    .cabecera { display: flex; align-items: center; gap: 12pt; padding-bottom: 10pt; border-bottom: 2pt solid rgb(var(--primario-500)); margin-bottom: 14pt; }
    .mascota { width: 42pt; height: 46pt; }
    .logo { height: 46pt; color: rgb(var(--primario-500)); }
    .lema { margin-left: auto; text-align: right; font-family: var(--fuente-display); text-transform: uppercase; line-height: 1; }
    .lema strong { display: block; font-size: 26pt; color: #1b120d; }
    .lema span { font-size: 11pt; color: rgb(var(--primario-600)); letter-spacing: .08em; }
    .columnas { column-count: 2; column-gap: 22pt; }
    .categoria { break-inside: avoid-column; margin-bottom: 12pt; }
    .categoria h2 { font-family: var(--fuente-display); text-transform: uppercase; font-size: 17pt; color: rgb(var(--primario-600)); margin: 0 0 5pt; border-bottom: 0.75pt solid #d8c7ad; padding-bottom: 2pt; }
    .plato { break-inside: avoid; margin-bottom: 6pt; }
    .fila { display: flex; align-items: baseline; gap: 4pt; }
    .plato h3 { font-family: var(--fuente-display); text-transform: uppercase; font-size: 11.5pt; margin: 0; }
    .plato h3 small { font-family: var(--fuente-texto); font-size: 7.5pt; color: #7a6450; letter-spacing: .04em; }
    .puntos { flex: 1; border-bottom: 1pt dotted #b9a68c; transform: translateY(-3pt); }
    .precio { font-weight: 800; font-variant-numeric: tabular-nums; }
    .plato p { margin: 1pt 0 0; color: #5b4a3a; font-size: 8.5pt; }
    .pie { margin-top: 10pt; padding-top: 6pt; border-top: 0.75pt solid #d8c7ad; font-size: 8pt; color: #5b4a3a; }
    .pie p { margin: 0 0 2pt; }
    .aviso { font-weight: 700; }
  `,
})
export class MenuImpresoComponent {
  protected readonly menu = inject(MenuService);
  private readonly c0 = inject(NegocioService).cliente;
  protected readonly c = this.c0;
  readonly grupos = computed(() => agruparPorCategoria(this.menu.platos(), this.menu.categorias()));
  readonly sitio = this.c0.sitio.url.replace(/^https?:\/\//, '');
  readonly instagram = `@${this.c0.redes.find((r) => r.red === 'instagram')?.usuario ?? ''}`;

  readonly leyenda = computed(() => {
    const d = this.menu.dietas();
    const partes = [d.vegetariano && 'V = vegetariano', d.sinGluten && 'SG = sin gluten', d.picante && 'P = picante'].filter(Boolean);
    return partes.length ? `${partes.join(' · ')} · ` : '';
  });
  readonly whatsapp = this.c0.contacto.whatsapp.activo ? formatoCelular(this.c0.contacto.whatsapp.numero) : '';

  precio(p: Plato) {
    return p.precioCombo ? `${formatoPrecio(p.precio)} · combo ${formatoPrecio(p.precioCombo)}` : formatoPrecio(p.precio);
  }

  marcas(p: Plato): string {
    const m: string[] = [];
    if (p.etiquetas?.includes('vegetariano')) m.push('V');
    if (p.etiquetas?.includes('sin-gluten')) m.push('SG');
    if (p.picante) m.push('P'.repeat(p.picante));
    if (p.estado === 'agotado') m.push('agotado');
    const texto = m.join(' · ');
    return p.ejemplo ? `${texto}${texto ? ' ' : ''}*` : texto;
  }
}
