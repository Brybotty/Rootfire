import type { CapaHamburguesa, Ilustracion, TipoPan } from '../menu.model';

/**
 * Ilustraciones planas de los platos (mientras llegan las fotos reales). Todo se arma con trazos
 * en una caja de 200 x 160: la hamburguesa se apila capa por capa según sus ingredientes.
 * Son funciones puras: el componente solo pinta las partes.
 */

export interface Parte {
  d: string;
  relleno?: string;
  trazo?: string;
  grosor?: number;
  opacidad?: number;
  evenodd?: boolean;
}

export interface Grupo {
  transform?: string;
  partes: Parte[];
}

const TINTA = '#1E0F09';
const C = {
  pan: '#E7A04B',
  panBrillo: '#F7C886',
  brioche: '#DF8D36',
  negro: '#3A2D29',
  negroBrillo: '#5A4943',
  ajonjoli: '#FFF1D0',
  carne: '#5B2B1A',
  carneBrillo: '#8A4A2C',
  pollo: '#D98B2B',
  polloBrillo: '#F2B65A',
  vegetal: '#9C8A3E',
  vegetalPunto: '#5F7E34',
  queso: '#FFC929',
  tocineta: '#C4533F',
  tocinetaVeta: '#F2A08E',
  lechuga: '#7DB548',
  lechugaOscura: '#5C8F33',
  tomate: '#E2412F',
  tomateClaro: '#F47A5E',
  cebolla: '#F3E2F7',
  cebollaBorde: '#A36AB8',
  caramelo: '#A8642A',
  carameloOscuro: '#7A4019',
  jalapeno: '#4F9A35',
  jalapenoClaro: '#CFE7A7',
  pepinillo: '#8BA83C',
  maduro: '#F2A541',
  maduroBorde: '#B5601F',
  huevo: '#FFF8EC',
  yema: '#FFB21E',
  salsa: '#D9481F',
  rojo: '#DD2C1B',
  rojoOscuro: '#B21F12',
  amarillo: '#FFC929',
  papa: '#FFCB4F',
  papaOscura: '#E7A33A',
  crema: '#FFF3DC',
  chocolate: '#4A2616',
  chocolateClaro: '#6B3A22',
  arequipe: '#C77A2E',
  vidrio: 'rgba(255,255,255,.14)',
  limonada: '#DCE98A',
  hielo: 'rgba(255,255,255,.55)',
  agua: '#9FD3E6',
  sombra: 'rgba(0,0,0,.28)',
};

const n = (v: number) => Math.round(v * 10) / 10;

/** Rectángulo con esquinas redondeadas. */
export function rectRedondo(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  return `M${n(x + rr)} ${n(y)}H${n(x + w - rr)}A${rr} ${rr} 0 0 1 ${n(x + w)} ${n(y + rr)}V${n(y + h - rr)}A${rr} ${rr} 0 0 1 ${n(x + w - rr)} ${n(y + h)}H${n(x + rr)}A${rr} ${rr} 0 0 1 ${n(x)} ${n(y + h - rr)}V${n(y + rr)}A${rr} ${rr} 0 0 1 ${n(x + rr)} ${n(y)}Z`;
}

export function elipse(cx: number, cy: number, rx: number, ry = rx): string {
  return `M${n(cx - rx)} ${n(cy)}a${rx} ${ry} 0 1 0 ${n(rx * 2)} 0a${rx} ${ry} 0 1 0 ${n(-rx * 2)} 0Z`;
}

/** Rectángulo girado `grados` alrededor de su base. */
function rectGirado(cx: number, base: number, w: number, h: number, grados: number): string {
  const a = (grados * Math.PI) / 180;
  const puntos = [
    [-w / 2, 0],
    [w / 2, 0],
    [w / 2, -h],
    [-w / 2, -h],
  ].map(([x, y]) => [cx + x * Math.cos(a) - y * Math.sin(a), base + x * Math.sin(a) + y * Math.cos(a)]);
  return `M${puntos.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`;
}

/** Onda entre x0 y x1 (para tocineta, cebolla caramelizada y lechuga). */
function onda(x0: number, x1: number, y: number, amplitud: number, paso: number, invertir = false): string {
  const tramos = Math.max(2, Math.round((x1 - x0) / paso));
  const ancho = (x1 - x0) / tramos;
  let d = '';
  for (let i = 0; i < tramos; i++) {
    const xa = invertir ? x1 - i * ancho : x0 + i * ancho;
    const xb = invertir ? xa - ancho : xa + ancho;
    const sentido = i % 2 === 0 ? -1 : 1;
    d += `Q${n((xa + xb) / 2)} ${n(y + sentido * amplitud * 2)} ${n(xb)} ${n(y)}`;
  }
  return d;
}

const contorno = (d: string, relleno: string, grosor = 3): Parte => ({ d, relleno, trazo: TINTA, grosor });

// ——— Hamburguesa ———

interface Capa {
  alto: number;
  partes: (cx: number, y: number) => Parte[];
}

const ANCHO = 128;

const CAPAS: Record<CapaHamburguesa, Capa> = {
  carne: {
    alto: 20,
    partes: (cx, y) => [
      contorno(rectRedondo(cx - ANCHO / 2, y, ANCHO, 20, 10), C.carne),
      { d: `M${cx - 42} ${y + 7}h11M${cx - 7} ${y + 6}h13M${cx + 28} ${y + 8}h10M${cx - 26} ${y + 13}h8M${cx + 12} ${y + 14}h8`, trazo: C.carneBrillo, grosor: 3 },
    ],
  },
  pollo: {
    alto: 22,
    partes: (cx, y) => [
      contorno(rectRedondo(cx - 66, y, 132, 22, 11), C.pollo),
      ...[-46, -24, -2, 20, 42, -36, 10, 32].map((dx, i) => ({ d: elipse(cx + dx, y + (i < 5 ? 7 : 15), 3.2, 2.2), relleno: C.polloBrillo })),
    ],
  },
  vegetal: {
    alto: 20,
    partes: (cx, y) => [
      contorno(rectRedondo(cx - 62, y, 124, 20, 10), C.vegetal),
      ...[-40, -16, 6, 30, 46, -28, 18].map((dx, i) => ({ d: elipse(cx + dx, y + (i < 5 ? 7 : 14), 2.4), relleno: C.vegetalPunto })),
    ],
  },
  queso: {
    alto: 6,
    partes: (cx, y) => {
      const x0 = cx - 68;
      const x1 = cx + 68;
      const gotas = [
        [cx + 40, 11],
        [cx + 2, 14],
        [cx - 36, 10],
      ];
      let d = `M${x0} ${y}H${x1}L${x1 + 4} ${y + 8}L${x1 - 6} ${y + 5}`;
      for (const [gx, largo] of gotas) {
        d += `H${gx + 5}C${gx + 5} ${y + largo + 4} ${gx - 5} ${y + largo + 4} ${gx - 5} ${y + 5}`;
      }
      d += `H${x0 + 6}L${x0 - 4} ${y + 8}Z`;
      return [{ d, relleno: C.queso, trazo: TINTA, grosor: 2.5 }];
    },
  },
  'queso-crema': {
    alto: 6,
    partes: (cx, y) => {
      const x0 = cx - 60;
      const x1 = cx + 60;
      let d = `M${x0} ${y + 1}${onda(x0, x1, y + 1, 1.2, 20)}V${y + 4}`;
      for (const [gx, largo] of [
        [cx + 38, 6],
        [cx + 4, 9],
        [cx - 30, 7],
      ]) {
        d += `H${gx + 5}C${gx + 5} ${y + largo + 4} ${gx - 5} ${y + largo + 4} ${gx - 5} ${y + 4}`;
      }
      return [{ d: `${d}H${x0}Z`, relleno: '#FFF8EC', trazo: TINTA, grosor: 2.4 }];
    },
  },
  'mermelada-tocineta': {
    alto: 9,
    partes: (cx, y) => {
      const x0 = cx - 64;
      const x1 = cx + 64;
      return [
        { d: `M${x0} ${y + 3}${onda(x0, x1, y + 3, 2.2, 14)}V${y + 8}${onda(x0, x1, y + 8, 1.8, 16, true)}Z`, relleno: '#6E2414', trazo: TINTA, grosor: 2.4 },
        { d: [-46, -28, -8, 12, 30, 48].map((dx, i) => elipse(cx + dx, y + 4.5 + (i % 2), 3.2, 1.6)).join(''), relleno: '#A5432A' },
        { d: [-38, -18, 2, 22, 40].map((dx) => elipse(cx + dx, y + 3.5, 1.1, 0.7)).join(''), relleno: '#E9A07A' },
      ];
    },
  },
  tocineta: {
    alto: 8,
    partes: (cx, y) => {
      const x0 = cx - 66;
      const x1 = cx + 66;
      return [
        { d: `M${x0} ${y + 2}${onda(x0, x1, y + 2, 2, 22)}V${y + 8}${onda(x0, x1, y + 8, 2, 22, true)}Z`, relleno: C.tocineta, trazo: TINTA, grosor: 2.5 },
        { d: `M${x0 + 4} ${y + 5}${onda(x0 + 4, x1 - 4, y + 5, 2, 22)}`, trazo: C.tocinetaVeta, grosor: 2 },
      ];
    },
  },
  lechuga: {
    alto: 9,
    partes: (cx, y) => {
      const x0 = cx - 70;
      const x1 = cx + 70;
      let d = `M${x0} ${y + 3}${onda(x0, x1, y + 3, 1.2, 18)}`;
      const arcos = 12;
      const paso = (x1 - x0) / arcos;
      for (let i = 0; i < arcos; i++) d += `a${n(paso / 2)} 5 0 0 1 ${n(-paso)} 0`;
      return [
        { d: `${d}Z`, relleno: C.lechuga, trazo: TINTA, grosor: 2.5 },
        { d: `M${x0 + 14} ${y + 6}h18M${cx - 8} ${y + 7}h16M${x1 - 34} ${y + 6}h18`, trazo: C.lechugaOscura, grosor: 2 },
      ];
    },
  },
  tomate: {
    alto: 9,
    partes: (cx, y) => [
      contorno(rectRedondo(cx - 62, y, 60, 9, 4.5), C.tomate, 2.5),
      contorno(rectRedondo(cx + 2, y, 60, 9, 4.5), C.tomate, 2.5),
      { d: `M${cx - 52} ${y + 4.5}h40M${cx + 12} ${y + 4.5}h40`, trazo: C.tomateClaro, grosor: 2 },
    ],
  },
  cebolla: {
    alto: 6,
    partes: (cx, y) => [
      { d: rectRedondo(cx - 58, y, 54, 6, 3), relleno: C.cebolla, trazo: C.cebollaBorde, grosor: 2.5 },
      { d: rectRedondo(cx + 2, y + 0.5, 56, 6, 3), relleno: C.cebolla, trazo: C.cebollaBorde, grosor: 2.5 },
    ],
  },
  'cebolla-caramelizada': {
    alto: 7,
    partes: (cx, y) => {
      const x0 = cx - 62;
      const x1 = cx + 62;
      return [
        { d: `M${x0} ${y + 2}${onda(x0, x1, y + 2, 1.6, 12)}V${y + 7}${onda(x0, x1, y + 7, 1.6, 12, true)}Z`, relleno: C.caramelo, trazo: TINTA, grosor: 2.2 },
        { d: `M${x0 + 6} ${y + 4.5}${onda(x0 + 6, x1 - 6, y + 4.5, 1.4, 10)}`, trazo: C.carameloOscuro, grosor: 1.6 },
      ];
    },
  },
  jalapeno: {
    alto: 9,
    partes: (cx, y) =>
      [-48, -24, 0, 24, 48].flatMap((dx) => [
        contorno(elipse(cx + dx, y + 4.5, 10, 4.5), C.jalapeno, 2.2),
        { d: elipse(cx + dx, y + 4.5, 4.4, 1.9), relleno: C.jalapenoClaro },
      ]),
  },
  pepinillos: {
    alto: 7,
    partes: (cx, y) =>
      [-38, 0, 38].flatMap((dx) => [contorno(elipse(cx + dx, y + 3.5, 17, 3.5), C.pepinillo, 2.2), { d: `M${cx + dx - 8} ${y + 3.5}h16`, trazo: '#C9D98A', grosor: 1.5 }]),
  },
  maduro: {
    alto: 10,
    partes: (cx, y) =>
      [-38, 0, 38].flatMap((dx) => [
        { d: elipse(cx + dx, y + 5, 21, 5), relleno: C.maduro, trazo: C.maduroBorde, grosor: 2.5 },
        { d: `M${cx + dx - 12} ${y + 3.5}q12-3 24 0`, trazo: '#FBD38A', grosor: 1.8 },
      ]),
  },
  huevo: {
    alto: 12,
    partes: (cx, y) => [
      contorno(`M${cx - 58} ${y + 8}C${cx - 60} ${y + 1} ${cx - 30} ${y - 1} ${cx - 10} ${y + 2}C${cx + 10} ${y - 2} ${cx + 52} ${y - 1} ${cx + 58} ${y + 6}C${cx + 62} ${y + 12} ${cx + 30} ${y + 13} ${cx} ${y + 12}C${cx - 30} ${y + 14} ${cx - 56} ${y + 13} ${cx - 58} ${y + 8}Z`, C.huevo, 2.5),
      contorno(elipse(cx + 6, y + 5, 11, 6), C.yema, 2.2),
      { d: `M${cx} ${y + 3}q3-2 7-1`, trazo: '#FFE3A0', grosor: 2 },
    ],
  },
  salsa: {
    alto: 4,
    partes: (cx, y) => {
      const x0 = cx - 60;
      const x1 = cx + 60;
      let d = `M${x0} ${y}H${x1}V${y + 3}`;
      for (const [gx, largo] of [
        [cx + 30, 9],
        [cx - 14, 12],
        [cx - 44, 7],
      ]) {
        d += `H${gx + 3.5}C${gx + 3.5} ${y + largo + 3} ${gx - 3.5} ${y + largo + 3} ${gx - 3.5} ${y + 3}`;
      }
      return [{ d: `${d}H${x0}Z`, relleno: C.salsa, trazo: TINTA, grosor: 2 }];
    },
  },
};

function panSuperior(cx: number, y: number, pan: TipoPan): Parte[] {
  if (pan === 'lechuga') {
    return [
      contorno(`M${cx - 64} ${y + 36}C${cx - 66} ${y + 10} ${cx - 34} ${y} ${cx} ${y + 2}C${cx + 34} ${y} ${cx + 66} ${y + 10} ${cx + 64} ${y + 36}Q${cx + 50} ${y + 30} ${cx + 36} ${y + 38}Q${cx + 20} ${y + 30} ${cx} ${y + 38}Q${cx - 20} ${y + 30} ${cx - 36} ${y + 38}Q${cx - 50} ${y + 30} ${cx - 64} ${y + 36}Z`, C.lechuga),
      { d: `M${cx} ${y + 6}V${y + 32}M${cx} ${y + 16}l-16 10M${cx} ${y + 16}l16 10M${cx} ${y + 24}l-28 10M${cx} ${y + 24}l28 10`, trazo: C.lechugaOscura, grosor: 2.2 },
    ];
  }
  const color = pan === 'negro' ? C.negro : pan === 'brioche' ? C.brioche : C.pan;
  const brillo = pan === 'negro' ? C.negroBrillo : C.panBrillo;
  const domo = `M${cx - 64} ${y + 38}C${cx - 64} ${y + 8} ${cx - 30} ${y} ${cx} ${y}C${cx + 30} ${y} ${cx + 64} ${y + 8} ${cx + 64} ${y + 38}Q${cx + 64} ${y + 42} ${cx + 60} ${y + 42}H${cx - 60}Q${cx - 64} ${y + 42} ${cx - 64} ${y + 38}Z`;
  const partes: Parte[] = [contorno(domo, color), { d: `M${cx - 44} ${y + 18}Q${cx - 32} ${y + 7} ${cx - 12} ${y + 6}`, trazo: brillo, grosor: 4.5, opacidad: 0.85 }];
  if (pan !== 'brioche') {
    const semillas = [
      [-30, 17, -20],
      [-8, 11, 10],
      [16, 14, -15],
      [36, 22, 20],
      [-44, 28, 30],
      [2, 25, -8],
      [26, 31, 12],
      [-22, 32, -25],
    ];
    partes.push({
      d: semillas
        .map(([dx, dy, g]) => {
          const a = (g * Math.PI) / 180;
          return `M${n(cx + dx - 2.6 * Math.cos(a))} ${n(y + dy - 2.6 * Math.sin(a))}L${n(cx + dx + 2.6 * Math.cos(a))} ${n(y + dy + 2.6 * Math.sin(a))}`;
        })
        .join(''),
      trazo: C.ajonjoli,
      grosor: 3.4,
    });
  }
  return partes;
}

function panInferior(cx: number, y: number, pan: TipoPan): Parte[] {
  if (pan === 'lechuga') {
    return [contorno(`M${cx - 62} ${y}H${cx + 62}Q${cx + 58} ${y + 18} ${cx} ${y + 18}Q${cx - 58} ${y + 18} ${cx - 62} ${y}Z`, C.lechuga)];
  }
  const color = pan === 'negro' ? C.negro : pan === 'brioche' ? C.brioche : C.pan;
  return [contorno(`M${cx - 58} ${y}H${cx + 58}Q${cx + 60} ${y} ${cx + 60} ${y + 4}V${y + 12}Q${cx + 60} ${y + 20} ${cx + 50} ${y + 20}H${cx - 50}Q${cx - 60} ${y + 20} ${cx - 60} ${y + 12}V${y + 4}Q${cx - 60} ${y} ${cx - 58} ${y}Z`, color)];
}

/** Hamburguesa apilada sobre `base` (y de la parte de abajo), centrada en cx. Escala si no cabe. */
export function hamburguesa(capas: CapaHamburguesa[], pan: TipoPan = 'ajonjoli', cx = 100, base = 140, altoMaximo = 128): Grupo {
  const solape = 3;
  const partes: Parte[] = [{ d: elipse(cx, base + 3, 72, 7), relleno: C.sombra }];
  let tope = base - 20;
  partes.push(...panInferior(cx, tope, pan));
  for (const nombre of capas) {
    const capa = CAPAS[nombre];
    tope = tope - capa.alto + solape;
    partes.push(...capa.partes(cx, tope));
  }
  tope = tope - 42 + solape + 2;
  partes.push(...panSuperior(cx, tope, pan));
  const alto = base - tope;
  const escala = alto > altoMaximo ? altoMaximo / alto : 1;
  return {
    transform: escala < 1 ? `translate(${cx} ${base}) scale(${n(escala * 100) / 100}) translate(${-cx} ${-base})` : undefined,
    partes,
  };
}

// ——— Acompañantes ———

function cajaPapas(x = 100, base = 150, escala = 1): Parte[] {
  const w = 76 * escala;
  const h = 70 * escala;
  const top = base - h;
  return [
    contorno(`M${n(x - w / 2)} ${n(top)}H${n(x + w / 2)}L${n(x + w / 2 - 9 * escala)} ${n(base - 4)}Q${n(x + w / 2 - 10 * escala)} ${base} ${n(x + w / 2 - 14 * escala)} ${base}H${n(x - w / 2 + 14 * escala)}Q${n(x - w / 2 + 10 * escala)} ${base} ${n(x - w / 2 + 9 * escala)} ${n(base - 4)}Z`, C.rojo),
    { d: `M${n(x - w / 2 + 2)} ${n(top + 9 * escala)}H${n(x + w / 2 - 2)}`, trazo: C.rojoOscuro, grosor: 3 },
    // Llama de la marca estampada en la caja
    {
      d: `M${x} ${n(top + 52 * escala)}c${n(-9 * escala)} 0 ${n(-14 * escala)} ${n(-6 * escala)} ${n(-14 * escala)} ${n(-13 * escala)}c0 ${n(-6 * escala)} ${n(4 * escala)} ${n(-10 * escala)} ${n(7 * escala)} ${n(-13 * escala)}c0 ${n(3 * escala)} ${n(2 * escala)} ${n(5 * escala)} ${n(4 * escala)} ${n(6 * escala)}c${n(-1 * escala)} ${n(-7 * escala)} ${n(3 * escala)} ${n(-12 * escala)} ${n(8 * escala)} ${n(-15 * escala)}c0 ${n(5 * escala)} ${n(2 * escala)} ${n(9 * escala)} ${n(5 * escala)} ${n(12 * escala)}c${n(3 * escala)} ${n(3 * escala)} ${n(4 * escala)} ${n(6 * escala)} ${n(4 * escala)} ${n(10 * escala)}c0 ${n(7 * escala)} ${n(-5 * escala)} ${n(13 * escala)} ${n(-14 * escala)} ${n(13 * escala)}Z`,
      relleno: C.amarillo,
    },
  ];
}

function papasFrancesa(x = 100, base = 150, escala = 1): Parte[] {
  const tope = base - 70 * escala;
  const papas = [
    [-26, 44, -10],
    [-15, 58, -5],
    [-4, 52, 3],
    [8, 62, 6],
    [18, 50, 12],
    [27, 42, 16],
    [-20, 34, -14],
    [12, 38, 9],
  ];
  return papas.map(([dx, alto, g]) => contorno(rectGirado(x + dx * escala, tope + 14 * escala, 9 * escala, alto * escala, g), C.papa, 2.4));
}

export function papas(estilo: 'francesa' | 'cascos' | 'cargadas' = 'francesa'): Grupo[] {
  if (estilo === 'cascos') {
    // Cascos: medialunas con piel (borde oscuro) apiladas en una bandeja de papel roja.
    const casco = (cx: number, cy: number, grados: number, largo = 40, grueso = 15): Parte[] => {
      const a = (grados * Math.PI) / 180;
      const [ux, uy] = [Math.cos(a), Math.sin(a)];
      const [nx, ny] = [Math.sin(a), -Math.cos(a)];
      const p1 = [cx - (ux * largo) / 2, cy - (uy * largo) / 2];
      const p2 = [cx + (ux * largo) / 2, cy + (uy * largo) / 2];
      const piel = [cx + nx * grueso * 1.9, cy + ny * grueso * 1.9];
      const corte = [cx + nx * grueso * 0.15, cy + ny * grueso * 0.15];
      const brillo = [cx + nx * grueso * 0.9, cy + ny * grueso * 0.9];
      return [
        contorno(`M${n(p1[0])} ${n(p1[1])}Q${n(piel[0])} ${n(piel[1])} ${n(p2[0])} ${n(p2[1])}Q${n(corte[0])} ${n(corte[1])} ${n(p1[0])} ${n(p1[1])}Z`, C.papa, 2.4),
        { d: `M${n(p1[0] + ux * 4)} ${n(p1[1] + uy * 4)}Q${n(piel[0])} ${n(piel[1])} ${n(p2[0] - ux * 4)} ${n(p2[1] - uy * 4)}`, trazo: '#B9651E', grosor: 3.4 },
        { d: `M${n(cx - ux * 8 + nx * 4)} ${n(cy - uy * 8 + ny * 4)}Q${n(brillo[0])} ${n(brillo[1])} ${n(cx + ux * 8 + nx * 4)} ${n(cy + uy * 8 + ny * 4)}`, trazo: '#FFE3A0', grosor: 2 },
      ];
    };
    return [
      {
        partes: [
          { d: elipse(100, 150, 58, 6), relleno: C.sombra },
          ...casco(78, 92, -25),
          ...casco(104, 82, 8),
          ...casco(126, 96, 32),
          ...casco(88, 108, 12),
          ...casco(116, 112, -14),
          contorno(`M46 112H154L144 146Q143 150 139 150H61Q57 150 56 146Z`, C.rojo),
          { d: `M50 120H150`, trazo: C.rojoOscuro, grosor: 3 },
          { d: [74, 92, 110, 128].map((x, i) => elipse(x, 104 - (i % 2) * 18, 1.6)).join(''), relleno: C.rojoOscuro },
        ],
      },
    ];
  }
  const partes = [{ d: elipse(100, 152, 46, 5), relleno: C.sombra }, ...papasFrancesa(), ...cajaPapas()];
  if (estilo === 'cargadas') {
    partes.push(
      contorno(`M66 86C70 72 86 74 92 78C98 70 116 70 122 80C130 76 140 80 134 92C126 98 120 92 114 98C110 108 104 100 100 96C94 104 86 104 84 96C76 100 64 98 66 86Z`, C.queso, 2.4),
      { d: [78, 96, 112, 124, 88, 104].map((x, i) => rectRedondo(x, 80 + (i % 2) * 7, 6, 5, 1.5)).join(''), relleno: C.tocineta, trazo: TINTA, grosor: 1.4 },
      { d: [84, 100, 118, 92, 110].map((x, i) => elipse(x, 78 + (i % 3) * 5, 2.2, 1.4)).join(''), relleno: '#6FAE3F' },
    );
  }
  return [{ partes }];
}

export function aros(cantidad: 5 | 10 = 5): Grupo[] {
  const aro = (cx: number, cy: number, rx: number, ry: number): Parte[] => [
    { d: elipse(cx, cy, rx, ry) + elipse(cx, cy, rx - 11, ry - 8), relleno: '#D99032', trazo: TINTA, grosor: 2.6, evenodd: true },
    { d: `M${cx - rx + 6} ${cy - 4}Q${cx - rx / 2} ${cy - ry + 2} ${cx} ${cy - ry + 3}`, trazo: '#F4C36A', grosor: 2.4 },
  ];
  return [
    {
      partes: [
        { d: elipse(100, 144, 70, 9), relleno: '#F7ECDA', trazo: TINTA, grosor: 3 },
        ...(cantidad === 10 ? [...aro(64, 126, 26, 14), ...aro(136, 126, 26, 14), ...aro(100, 128, 28, 15)] : []),
        ...aro(76, cantidad === 10 ? 108 : 122, 30, 16),
        ...aro(126, cantidad === 10 ? 108 : 122, 30, 16),
        ...aro(100, cantidad === 10 ? 86 : 100, 32, 18),
        { d: elipse(150, 92, 12, 5) + `M138 92v12a12 5 0 0 0 24 0V92`, relleno: C.salsa, trazo: TINTA, grosor: 2.4 },
      ],
    },
  ];
}

// ——— Bebidas y postres ———

function vaso(x = 100, base = 150, escala = 1, color = C.rojo): Parte[] {
  const e = (v: number) => n(v * escala);
  const top = base - 98 * escala;
  return [
    { d: elipse(x, base + 2, e(34), e(4.5)), relleno: C.sombra },
    contorno(`M${n(x - e(30))} ${n(top + e(10))}H${n(x + e(30))}L${n(x + e(22))} ${n(base - e(3))}Q${n(x + e(21.6))} ${base} ${n(x + e(18))} ${base}H${n(x - e(18))}Q${n(x - e(21.6))} ${base} ${n(x - e(22))} ${n(base - e(3))}Z`, color),
    { d: `M${n(x - e(27))} ${n(top + e(40))}H${n(x + e(27))}L${n(x + e(25.4))} ${n(top + e(60))}H${n(x - e(25.4))}Z`, relleno: C.amarillo },
    { d: `M${n(x + e(20))} ${n(top)}L${n(x + e(30))} ${n(top - e(30))}H${n(x + e(40))}`, trazo: C.amarillo, grosor: e(5.5) },
    contorno(rectRedondo(x - e(35), top, e(70), e(12), e(5)), '#F7ECDA'),
  ];
}

export function bebida(estilo: 'gaseosa' | 'limonada' | 'malteada' | 'agua' | 'botella', color = '#3B160C'): Grupo[] {
  if (estilo === 'gaseosa') return [{ partes: vaso() }];
  if (estilo === 'botella') {
    // Botella de vidrio pequeña, genérica (sin logos): el color es el del líquido.
    return [
      {
        partes: [
          { d: elipse(100, 152, 28, 4.5), relleno: C.sombra },
          contorno(`M92 22h16v8c0 10 14 18 14 40v72a8 8 0 0 1-8 8H86a8 8 0 0 1-8-8V70c0-22 14-30 14-40v-8Z`, color),
          { d: `M80 92h40v28H80Z`, relleno: C.rojo },
          { d: `M80 92h40M80 120h40`, trazo: TINTA, grosor: 2 },
          { d: `M88 106q12-8 24 0`, trazo: '#FFF6E6', grosor: 3 },
          contorno(rectRedondo(89, 14, 22, 10, 2.5), '#C9CED6', 2.6),
          { d: `M86 66q2-16 10-22`, trazo: 'rgba(255,255,255,.55)', grosor: 3.4 },
          { d: `M85 128v12`, trazo: 'rgba(255,255,255,.35)', grosor: 3 },
        ],
      },
    ];
  }
  if (estilo === 'agua') {
    return [
      {
        partes: [
          { d: elipse(100, 152, 30, 4.5), relleno: C.sombra },
          contorno(`M90 34h20v10c0 6 14 10 14 24v74a8 8 0 0 1-8 8H84a8 8 0 0 1-8-8V68c0-14 14-18 14-24V34Z`, C.agua),
          { d: rectRedondo(80, 86, 40, 30, 4), relleno: '#F7ECDA' },
          { d: `M90 101h20`, trazo: C.rojo, grosor: 4 },
          contorno(rectRedondo(88, 24, 24, 12, 3), C.rojo, 2.6),
          { d: `M84 72q0-8 6-12`, trazo: 'rgba(255,255,255,.7)', grosor: 3 },
        ],
      },
    ];
  }
  if (estilo === 'limonada') {
    return [
      {
        partes: [
          { d: elipse(100, 152, 32, 4.5), relleno: C.sombra },
          { d: `M110 46l14-34h10`, trazo: C.rojo, grosor: 5 },
          { d: `M73 66h54l-5.6 80H78.6Z`, relleno: C.limonada },
          { d: rectRedondo(82, 74, 14, 14, 3) + rectRedondo(102, 82, 14, 14, 3) + rectRedondo(88, 98, 13, 13, 3), relleno: C.hielo },
          { d: `M70 44h60l-7.6 104a4 4 0 0 1-4 3.6H81.6a4 4 0 0 1-4-3.6Z`, relleno: C.vidrio, trazo: TINTA, grosor: 3 },
          contorno(elipse(128, 50, 16), '#E8F27A', 2.6),
          { d: `M128 50l0-12M128 50l11 6M128 50l-11 6M128 50l11-6M128 50l-11-6M128 50v12`, trazo: '#B9C94A', grosor: 1.6 },
          contorno(`M76 44c-6-10 0-18 10-16-2 8-4 12-10 16Z`, '#5FA343', 2.2),
        ],
      },
    ];
  }
  // Malteada
  return [
    {
      partes: [
        { d: elipse(100, 152, 26, 4), relleno: C.sombra },
        { d: `M108 40l14-32h10`, trazo: C.rojo, grosor: 5 },
        contorno(`M86 150h28M100 150v-16`, 'none'),
        contorno(`M70 60h60l-10 66q-2 8-20 8t-20-8Z`, '#F6E2C6'),
        { d: `M74 84h52`, trazo: '#E9CFA9', grosor: 3 },
        contorno(`M66 62c-6-12 8-20 16-14 2-12 22-14 26-2 8-8 24-2 22 10 4 2 6 6 4 10H68c-3-1-4-2-2-4Z`, C.crema),
        contorno(elipse(104, 34, 8), C.rojo, 2.6),
        { d: `M106 26q4-10 12-12`, trazo: TINTA, grosor: 2.4 },
        { d: `M101 31q2-2 4-1`, trazo: 'rgba(255,255,255,.8)', grosor: 2 },
      ],
    },
  ];
}

export function postre(estilo: 'brownie' | 'helado'): Grupo[] {
  if (estilo === 'brownie') {
    return [
      {
        partes: [
          { d: elipse(100, 146, 70, 9), relleno: '#F7ECDA', trazo: TINTA, grosor: 3 },
          contorno(`M54 102l14-14h78l-14 14Z`, C.chocolateClaro, 2.6),
          contorno(`M54 102h78v36H54Z`, C.chocolate, 2.6),
          contorno(`M132 102l14-14v36l-14 14Z`, '#3A1D10', 2.6),
          contorno(`M76 92c-8-18 10-30 24-26 12-6 30 4 26 20 6 10-4 18-16 14-10 6-22 4-26-2-10 2-14-2-8-6Z`, C.crema),
          { d: `M64 112q10 6 20 0t20 0 20 0`, trazo: '#2A140C', grosor: 3 },
          { d: `M86 94q4 10 0 18M112 92q2 8-2 14`, trazo: C.arequipe, grosor: 3 },
          { d: elipse(118, 76, 2) + elipse(90, 80, 1.6) + elipse(104, 70, 1.6), relleno: '#2A140C' },
        ],
      },
    ];
  }
  return [
    {
      partes: [
        { d: elipse(100, 150, 40, 5), relleno: C.sombra },
        contorno(`M86 150h28l-6-18h-16Z`, '#F7ECDA'),
        contorno(`M62 96h76q-4 36-38 36T62 96Z`, '#F7ECDA'),
        { d: `M66 108h68`, trazo: C.rojo, grosor: 4 },
        contorno(`M70 96c-6-18 8-30 24-24 4 8 4 18-2 24Z`, C.chocolateClaro),
        contorno(`M88 92c-4-22 12-36 30-28 14 2 22 16 16 32H90Z`, C.crema),
        { d: `M92 78q6-8 18-10M118 70q8 4 10 14M98 92q6-10 2-20`, trazo: C.arequipe, grosor: 3.2 },
        { d: `M76 82q4-4 8-4`, trazo: 'rgba(255,255,255,.35)', grosor: 2.4 },
      ],
    },
  ];
}

/** Hamburguesa con papas y bebida. Con cantidad 2, una segunda hamburguesa detrás. */
export function combo(capas: CapaHamburguesa[], pan: TipoPan = 'brioche', cantidad: 1 | 2 = 1): Grupo[] {
  const juntar = (propio: string, grupo: Grupo) => [propio, grupo.transform].filter(Boolean).join(' ');
  // De atrás hacia adelante: vaso, (segunda hamburguesa), papas y la hamburguesa del frente.
  const grupos: Grupo[] = [{ transform: 'translate(160 142) scale(.8) translate(-100 -150)', partes: vaso(100, 150, 1, C.rojo) }];
  if (cantidad === 2) {
    const atras = hamburguesa(capas, pan, 100, 140, 120);
    grupos.push({ transform: juntar('translate(98 124) scale(.58) translate(-100 -140)', atras), partes: atras.partes });
  }
  grupos.push({ transform: 'translate(128 148) scale(.6) translate(-100 -150)', partes: [...papasFrancesa(), ...cajaPapas()] });
  const frente = hamburguesa(capas, pan, 100, 140, 110);
  grupos.push({ transform: juntar('translate(70 148) scale(.72) translate(-100 -140)', frente), partes: frente.partes });
  return grupos;
}

/** Las partes de cualquier ilustración del menú. */
export function dibujar(ilustracion: Ilustracion): Grupo[] {
  switch (ilustracion.tipo) {
    case 'hamburguesa':
      return [hamburguesa(ilustracion.capas, ilustracion.pan)];
    case 'combo':
      return combo(ilustracion.capas, ilustracion.pan, ilustracion.cantidad);
    case 'papas':
      return papas(ilustracion.estilo);
    case 'aros':
      return aros(ilustracion.cantidad);
    case 'bebida':
      return bebida(ilustracion.estilo, ilustracion.color);
    case 'postre':
      return postre(ilustracion.estilo);
  }
}
