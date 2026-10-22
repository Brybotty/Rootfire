import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import type { Plato } from './menu.model';
import { MenuService } from './menu.service';

const PARAMETRO = 'plato';

/**
 * Plato abierto en el detalle. Usa el historial del navegador: `?plato=id` se puede compartir y el
 * botón "atrás" del celular cierra la hoja en lugar de salir de la página.
 */
@Injectable({ providedIn: 'root' })
export class DetalleService {
  private readonly menu = inject(MenuService);
  readonly abierto = signal<Plato | null>(null);
  /** Elemento que abrió el detalle, para devolverle el foco al cerrar. */
  private origen: HTMLElement | null = null;

  constructor() {
    const alNavegar = () => this.abierto.set(this.desdeUrl());
    window.addEventListener('popstate', alNavegar);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('popstate', alNavegar));
  }

  /** Abre el plato de la URL al cargar la página (enlace compartido). */
  abrirDesdeUrl() {
    const plato = this.desdeUrl();
    if (plato) {
      history.replaceState(null, '', this.url(null));
      history.pushState({ [PARAMETRO]: plato.id }, '', this.url(plato.id));
      this.abierto.set(plato);
    }
  }

  abrir(plato: Plato, origen?: HTMLElement | null) {
    this.origen = origen ?? (document.activeElement as HTMLElement | null);
    if (this.abierto()) history.replaceState({ [PARAMETRO]: plato.id }, '', this.url(plato.id));
    else history.pushState({ [PARAMETRO]: plato.id }, '', this.url(plato.id));
    this.abierto.set(plato);
  }

  cerrar() {
    if (!this.abierto()) return;
    if (history.state?.[PARAMETRO]) {
      history.back();
    } else {
      history.replaceState(null, '', this.url(null));
      this.abierto.set(null);
    }
  }

  /** Lo llama el detalle cuando terminó de cerrarse. */
  devolverFoco() {
    this.origen?.focus({ preventScroll: true });
    this.origen = null;
  }

  enlace(plato: Plato): string {
    return new URL(this.url(plato.id), location.href).href;
  }

  private desdeUrl(): Plato | null {
    const id = new URLSearchParams(location.search).get(PARAMETRO);
    return (id && this.menu.plato(id)) || null;
  }

  private url(id: string | null): string {
    const parametros = new URLSearchParams(location.search);
    if (id) parametros.set(PARAMETRO, id);
    else parametros.delete(PARAMETRO);
    const consulta = parametros.toString();
    return `${location.pathname}${consulta ? `?${consulta}` : ''}${location.hash}`;
  }
}
