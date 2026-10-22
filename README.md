# Rootfire Burgers · Menú en línea

Página para **ver el menú** de Rootfire Burgers (@rootfire_burgers), pensada para abrirse desde el QR de la mesa, y
para **armar el pedido y enviarlo por WhatsApp**. Sin pagos, cuentas ni inicio de sesión.
Angular 20 (standalone, signals, sin zone.js) + Tailwind CSS 3.

## Comandos

```bash
npm install
npm start            # prepara los archivos de la config y abre ng serve en http://localhost:4201
npm run build        # build de producción en dist/rootfire-burgers/browser
npm test             # pruebas unitarias (Karma + Chrome sin ventana)
npm run revisar      # después de build: revisión con Puppeteer y capturas en revision/ (puerto 4301; PUERTO=4302 si está ocupado)
npm run safari       # después de build: lo mismo en Safari 16.4 (iPhone); capturas en revision-safari/
npm run qr           # QR de la dirección final (SVG, PNG y tarjeta de mesa en PDF) en qr/
npm run qr -- https://midominio.com
npm run marca        # regenera favicon e íconos (cabecita de la mascota) y la imagen para redes (assets oficiales)
npm run nombres      # rótulos de los platos: de recursos/nombres/<id>.svg a src/app/marca/nombres.ts
npm run promo        # afiche de la promo del mes: de recursos/promos/<id>.png a WebP en public/promos/
```

El puerto 4200 se deja libre a propósito (otro proyecto suele usarlo).

## Dónde se cambia cada cosa

| Qué | Archivo |
|---|---|
| Datos del negocio, textos, horario, dirección, mapa, WhatsApp, redes, colores y fuentes | `src/app/config/clientes/rootfire.ts` |
| Cliente activo (para reutilizar la base con otra hamburguesería) | `src/app/config/cliente.ts` |
| Menú: categorías, platos, precios, etiquetas, alérgenos, adicionales | `src/app/config/menu.ts` |
| Logotipo oficial (trazos) y lista de stickers: generados, no se editan | `src/app/marca/oficial.ts`, `src/app/marca/stickers.ts` |
| Cabecita de la mascota (el ícono de la página; sigue el mouse con los ojos) | `src/app/marca/mascota.ts`, `mascota.component.ts` |
| Stickers, sello y fotos de las hamburguesas | `public/stickers/`, `public/marca/`, `public/platos/` |
| Rótulos: el nombre de cada hamburguesa con la letra de la carta (SVG de la diseñadora) | `recursos/nombres/<id del plato>.svg` → `npm run nombres` |
| Promo del mes: afiche original y sus datos | `recursos/promos/<id>.png` → `npm run promo`; datos en `promocion` (config del cliente) |
| Originales de la diseñadora (Illustrator y fotos de estudio; no se publican) | `recursos/originales/` |

`npm start` y `npm run build` corren antes `npm run preparar`, que escribe desde la config:
`src/tema.css` (colores y fuentes), el bloque SEO de `src/index.html` (título, Open Graph y JSON-LD de
Restaurant + Menu), `public/manifest.webmanifest`, `public/robots.txt` y `public/sitemap.xml`. No se editan a mano.

### Menú
- La carta actual es la impresa de Rootfire: 5 hamburguesas (precio sola y en combo), 3 adiciones y 2 bebidas.
- Cada plato tiene `id`, `categoriaId`, `nombre`, `descripcion`, `frase` (el remate en negrilla), `ingredientes`,
  `precio` (sola) y `precioCombo`, `tono` (color de su tarjeta), `etiquetas` (`vegetariano`, `sin-gluten`, `nuevo`,
  `favorito`), `picante` (0 a 3), `alergenos`, `adicionales`, `estado: 'agotado'`,
  `tiempoLimitado: { hasta: 'AAAA-MM-DD' }` y `destacado` (con uno solo sale como "La estrella de la casa").
- `notaCombo` dice qué incluye el combo; `rangosPrecio`, los cortes de los filtros de precio.
- Estilos de categoría: `cartel` (tarjetas de color con tiquetes, como su carta), `lista` (filas nombre ··· precio),
  `combo` (ticket kraft) y `normal`. Los colores de cada `tono` están en la config del cliente (`tema.tonos`).
- Los filtros vegetariano, picante y sin gluten solo aparecen si algún plato tiene esa etiqueta.
- **Platos de ejemplo:** los que tienen `ejemplo: true` se marcan "Ejemplo" en la página y no van a los datos para Google.
- **Fotos:** las 5 hamburguesas usan las fotos de la diseñadora, recortadas (fondo transparente) y en WebP con dos
  tamaños (`platos/<id>.webp` de 960 px y `platos/<id>-480.webp` para celular). Para otra foto: guárdala en
  `public/platos/` y agrega al plato `foto: { src, ancho, alto, pequena: { src, ancho }, recortada: true, alt }`.
  Sin foto se dibuja la ilustración del plato (`ilustracion`): así salen las adiciones y las bebidas.
- **Horario:** de domingo a sábado; `[{ abre: '17:00', cierra: '23:00' }]`, `[]` = cerrado, `null` = abre ese día pero
  la hora está por confirmar. Un cierre menor que la apertura pasa de medianoche (`'01:00'`).
  `horarioFestivos` es el horario de los festivos de Colombia, caigan el día que caigan (se calculan solos en
  `src/app/negocio/festivos.ts`, sin lista que actualizar cada año); `[]` = los festivos se cierra.

### Rótulos
El nombre de cada hamburguesa no es texto: es el rótulo de la diseñadora (la letra de la carta impresa), pintado con el
color de título de su tarjeta. También van en rótulo los títulos "Adiciones" y "Bebidas" (dentro de su panel verde,
como en la carta) y la frase del pie, "El fuego no es para tibios" (`cierre.svg`). Para una hamburguesa nueva: pide el
SVG con el texto convertido a contornos, guárdalo como `recursos/nombres/<id del plato>.svg` y corre
`npm run nombres`. Sin rótulo, sale con texto. El nombre sigue en la página como texto oculto, para lectores de
pantalla, buscadores y la búsqueda del menú. Se pintan con `<app-rotulo [clave]="id" [texto]="nombre" />`.

### Pedido por WhatsApp
Con `contacto.whatsapp.pedidos: true` la página deja armar el pedido: en el detalle de cada hamburguesa se elige sola
o en combo (con su acompañamiento, de `acompanamientosCombo` en el menú) y la cantidad; las adiciones y bebidas se
agregan con el "+" de su fila. "Ver pedido" abre la lista con cantidades, entrega (a domicilio o para recoger), una
nota y el botón que abre WhatsApp con el mensaje listo. La página no cobra ni pide datos personales (la dirección se
habla en el chat) y el pedido se guarda en el navegador solo por ese día. Con `pedidos: false` vuelve a ser un menú
para ver. La lógica está en `src/app/pedido/` (con pruebas) y las vistas en `src/app/secciones/pedido/`.

### Promo del mes
`promocion` en la config del cliente: `id`, `etiqueta` ("Promo de octubre"), `titulo`, `precio`, `detalle` (qué trae),
`nota`, `vigencia` (`desde` y `hasta`, en hora de Colombia), `afiche` y, si es de un plato, `platoId` y `cantidad`.
Para cambiarla: guarda el afiche como `recursos/promos/<id>.png`, cambia los datos y corre `npm run promo` (lo deja en
WebP de 1080 y 720 px y borra el del mes anterior de `public/`). Mientras esté vigente sale en tres sitios: la
ventana del afiche (sola, una vez al día por navegador y solo cuando el afiche ya cargó), el botón del inicio y un
sello en la tarjeta de su plato. El enlace
`https://…/?promo` abre la ventana de una vez: sirve para historias de Instagram y estados de WhatsApp. Fuera de las
fechas, o sin `promocion`, no sale nada.

### Pasar el menú a Firestore (más adelante)
El modelo (`src/app/menu/menu.model.ts`) ya son documentos planos. Bastaría con crear las colecciones `categorias` y
`platos`, llenar `MenuService.menu` desde Firestore (por ejemplo con `onSnapshot`) y un panel de administración con
reglas que solo dejen escribir al admin. El resto de la app se recalcula sola con signals.

### Assets oficiales (logotipo, sello, stickers, paleta y fotos)
Salen de los archivos de la diseñadora de Rootfire (`recursos/originales/ASSETS ROOTFIRE.ai` y `MENÚ RGB.ai`), que son
compatibles con PDF. `scripts/assets/extraer.py` los convierte en: trazos del logotipo (`src/app/marca/oficial.ts`),
un SVG por sticker (`public/stickers/`, con los nombres de `scripts/assets/stickers.json`), el sello en dos piezas
(`public/marca/`), logotipos sueltos para imprenta (`recursos/marca/`) y las hamburguesas recortadas (`public/platos/`).
Solo hay que correrlo si la diseñadora cambia los archivos:

```bash
python -m venv .venv
.venv\Scripts\pip install pymupdf pillow
.venv\Scripts\python scripts/assets/extraer.py
npm run marca && npm run qr
```

`recursos/stickers-hoja.png` muestra los 49 stickers numerados. Para usar uno: `<app-sticker nombre="corona" />`.
El `.ai` del menú pesa 101 MB y está en `.gitignore` (GitHub no acepta archivos de más de 100 MB).

## Decisiones técnicas
- **Sin zone.js, sin router y sin formularios de Angular:** una sola página; menos JavaScript.
- **Carga inicial ≈ 107 KB transferidos** (JS 95 KB + CSS 12 KB) más dos fuentes precargadas (55 KB). Se probó `@defer`
  para las secciones de abajo y transfería más (código partido en trozos que comprimen peor), así que no se usa.
- **Fuentes propias en `public/fonts`:** Bricolage Grotesque recortada a ancho condensado y pesos 600–800 (35 KB) y Figtree
  (20 KB). Servidas desde el mismo dominio: sin terceros, compatibles con la CSP y disponibles sin conexión.
  Se recortaron con fontTools: `fonttools varLib.instancer <archivo> opsz=72 wdth=75 wght=600:800` y
  `fonttools subset --unicodes=<latino> --layout-features='*' --flavor=woff2`.
- **PWA** con `@angular/service-worker`: instalable y el menú abre sin conexión una vez cargado; aviso de versión nueva.
- **Detalle del plato** con `<dialog>` nativo (foco, Esc y fondo inerte). Usa `?plato=id`: se puede compartir y el botón
  "atrás" del celular lo cierra.
- **Mapa** de Google solo cuando está por aparecer en pantalla, y solo si es un enlace de inserción de Google Maps.
  Va en oscuro (filtro CSS) y con el "fueguito" de la marca sobre el punto del local: el iframe es de Google y su pin
  no se puede cambiar, pero Google lo pinta justo en el centro, así que el sticker va encima. El mapa arranca fijo
  (no atrapa el scroll en celular); "Explorar el mapa" lo desbloquea y quita el sticker.
- **Impresión:** hoja de estilos propia (A4, dos columnas, puntos guía). Botón "Imprimir o guardar PDF".

## Dependencias de desarrollo agregadas
| Paquete | Para qué |
|---|---|
| `tailwindcss@3`, `postcss` | Estilos (Angular los detecta solo) |
| `puppeteer-core` | Usa el Chrome instalado: revisión automática, íconos, imagen para redes y QR (no descarga otro navegador) |
| `qrcode` | Genera la matriz del QR |

En el navegador solo va Angular (`core`, `common`, `platform-browser`, `service-worker`). Sin librerías de animación:
CSS, `IntersectionObserver` y SVG.

## Seguridad
`firebase.json` deja listo Hosting con `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS,
`Cross-Origin-Opener-Policy` y una CSP (`script-src 'self'`, fuentes propias, `frame-src` solo para Google Maps).
Caché larga solo para archivos con hash. Proyecto de Firebase: `rootfire-burgers` (`.firebaserc`). **Publicado** en https://rootfire-burgers.web.app (última vez: 2026-10-09) (`npm run build && firebase deploy --only hosting`).
No hay llaves en el repositorio: la configuración web de Firebase se agregará cuando el menú pase a Firestore.

## Diseño
- Marca: el **logotipo, el sello y los stickers oficiales** de la diseñadora de Rootfire, más la **cabecita de la
  mascota** hecha para la página (barra, inicio, favicon, íconos de la app, hoja impresa y centro del QR): en el inicio
  se mece, parpadea y sigue el mouse con los ojos. El logotipo de letras que se había propuesto al principio se retiró.
- Colores: base oscura (carbón cálido) con la **paleta oficial** encima: amarillo `#FFCB00` (botones con texto oscuro),
  naranja `#FF6006`, rojo `#D11813`, verde `#8CBD00`, verde oscuro `#005225` y crema `#FAE6CB`.
- Diseño y desarrollo · ProjectRyann (configurable en `firma`).
