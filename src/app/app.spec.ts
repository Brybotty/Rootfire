import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideServiceWorker } from '@angular/service-worker';
import { App } from './app';
import { MENU } from './config/menu';
import { ROTULOS } from './marca/nombres';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideServiceWorker('ngsw-worker.js', { enabled: false })],
    }).compileComponents();
  });

  async function crear() {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const titulos = (el: HTMLElement) => [...el.querySelectorAll('#menu [data-seccion] h4')].map((h) => h.textContent?.trim());

  it('muestra el titular y todas las categorías del menú', async () => {
    const { el } = await crear();
    expect(el.querySelector('h1')?.textContent).toContain('Jugamos');
    expect(el.querySelectorAll('#menu [data-seccion]').length).toBe(MENU.categorias.length);
    expect(titulos(el).length).toBe(MENU.platos.length);
  });

  it('la búsqueda filtra al instante y sin importar tildes', async () => {
    const { fixture, el } = await crear();
    const campo = el.querySelector<HTMLInputElement>('#buscador')!;
    campo.value = 'platano';
    campo.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(titulos(el)).toEqual(['La Madurita']);
  });

  it('el filtro de precio deja solo los platos del rango', async () => {
    const { fixture, el } = await crear();
    const boton = [...el.querySelectorAll<HTMLButtonElement>('[aria-label="Filtros"] button')].find((b) => b.textContent?.includes('Hasta'))!;
    boton.click();
    await fixture.whenStable();
    expect(boton.getAttribute('aria-pressed')).toBe('true');
    const esperados = MENU.platos.filter((p) => p.precio <= MENU.rangosPrecio[0]).map((p) => p.nombre);
    expect(titulos(el)).toEqual(esperados);
  });

  it('muestra los precios sola y en combo con lo que incluye el combo', async () => {
    const { el } = await crear();
    const hamburguesas = el.querySelector('#cat-hamburguesas')!;
    expect(hamburguesas.textContent).toContain('En combo');
    expect(hamburguesas.querySelectorAll('.tiquete').length).toBe(MENU.platos.filter((p) => p.precioCombo).length * 2);
    expect(hamburguesas.textContent).toContain(MENU.notaCombo!);
  });

  it('las hamburguesas llevan su rótulo y el nombre sigue como texto', async () => {
    const { el } = await crear();
    const hamburguesas = MENU.platos.filter((p) => p.categoriaId === 'hamburguesas');
    expect(el.querySelectorAll('#cat-hamburguesas app-rotulo svg').length).toBe(hamburguesas.filter((p) => ROTULOS[p.id]).length);
    expect([...el.querySelectorAll('#cat-hamburguesas h4')].map((h) => h.textContent?.trim())).toEqual(hamburguesas.map((p) => p.nombre));
  });

  it('el horario trae las horas y los festivos', async () => {
    const { el } = await crear();
    const horario = el.querySelector('#visitanos')!.textContent!;
    expect(horario).toContain('Los festivos también abrimos');
    expect(horario).not.toContain('por confirmar');
  });

  it('las listas con rótulo llevan el título dibujado en el panel y el de la sección queda para lectores de pantalla', async () => {
    const { el } = await crear();
    const adiciones = el.querySelector('#cat-adiciones')!;
    expect(adiciones.querySelector('header')!.classList).toContain('sr-only');
    expect(adiciones.querySelector('h3')!.textContent!.trim()).toBe('Adiciones');
    expect(adiciones.querySelectorAll('app-lista-platos app-rotulo svg').length).toBe(1);
    expect(el.querySelector('#cat-hamburguesas header')!.classList).not.toContain('sr-only');
  });

  it('agregar desde una lista muestra la barra del pedido con las unidades y el total', async () => {
    localStorage.removeItem('rootfire:pedido');
    const { fixture, el } = await crear();
    expect(el.querySelector('app-pedido-barra button')).toBeNull();
    const mas = el.querySelector<HTMLButtonElement>('#cat-adiciones li button')!;
    mas.click();
    mas.click();
    await fixture.whenStable();
    const barra = el.querySelector('app-pedido-barra button')!.textContent!.replace(/\s+/g, ' ');
    const adicion = MENU.platos.find((p) => p.categoriaId === 'adiciones')!;
    expect(barra).toContain('Ver pedido 2');
    expect(barra).toContain(new Intl.NumberFormat('es-CO').format(adicion.precio * 2));
    expect(mas.getAttribute('aria-label')).toBe(`Agregar ${adicion.nombre} al pedido (llevas 2)`);
    localStorage.removeItem('rootfire:pedido');
  });

  it('sin platos de ejemplo ni filtros de dieta vacíos', async () => {
    const { el } = await crear();
    expect(el.textContent).not.toContain('Menú de demostración');
    const filtros = el.querySelector('[aria-label="Filtros"]')!.textContent!;
    expect(filtros).not.toContain('Vegetariano');
    expect(filtros).not.toContain('Sin gluten');
  });
});
