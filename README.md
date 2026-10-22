# Rootfire Burgers · Menú en línea

Página para **ver el menú** de Rootfire Burgers (@rootfire_burgers), pensada para abrirse desde el QR de la mesa, y
para **armar el pedido y enviarlo por WhatsApp**. Sin pagos. Registrarse es **opcional**: quien entra al
**Club Rootfire** puede tener descuento y tarjeta de sellos. El negocio cambia precios, platos, promos, cupones y el
Club desde el **panel** (`/admin`), sin publicar nada.
Angular 20 (standalone, signals, sin zone.js) + Tailwind CSS 3 + Firebase (Auth, Firestore y Storage; solo se
descarga en la cuenta, el panel y para quien tiene sesión del Club).

## Comandos

```bash
npm install
npm start            # prepara los archivos de la config y abre ng serve en http://localhost:4201
npm run build        # build de producción en dist/rootfire-burgers/browser
npm test             # pruebas unitarias (Karma + Chrome sin ventana)
npm run test:reglas  # pruebas de firestore.rules y storage.rules en los emuladores (no toca datos reales)
npm run demo         # el Club y el panel con los emuladores de Firebase y datos de prueba (http://localhost:4201)
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
| **Precios, platos, bebidas, adiciones, categorías, promos, banners, cupones y el Club** | **El panel: `/admin`** (se ve sin publicar nada) |
| Datos del negocio, textos, horario, dirección, mapa, WhatsApp, redes, colores y fuentes | `src/app/config/clientes/rootfire.ts` |
| Responsable de los datos (razón social, NIT, correo) y versión de la política | `legal` en `src/app/config/clientes/rootfire.ts` |
| Configuración web de Firebase y cuenta principal del panel | `firebase` y `adminEmail` en la config (y en `firestore.rules` / `storage.rules`) |
| Cliente activo (para reutilizar la base con otra hamburguesería) | `src/app/config/cliente.ts` |
| Menú de arranque y de respaldo (lo que se carga en Firestore la primera vez) | `src/app/config/menu.ts` |
| Política de datos y cookies, términos y condiciones | `src/app/paginas/politica-datos.component.ts`, `terminos.component.ts` |
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
- **Desde que la carta está en Firestore, el menú se cambia en el panel** (`/admin` → *Menú y precios*): los precios en la
  misma fila, el resto en el editor de cada producto. `config/menu.ts` queda como la carta de arranque y la de respaldo
  (sin conexión la página usa la última copia que guardó el navegador). Lo de abajo describe los campos de cada plato.
- La carta actual es la impresa de Rootfire: 5 hamburguesas (precio sola y en combo), 3 adiciones y 2 bebidas.
- Cada plato tiene `id`, `categoriaId`, `nombre`, `descripcion`, `frase` (el remate en negrilla), `ingredientes`,
  `precio` (sola) y `precioCombo`, `tono` (color de su tarjeta), `etiquetas` (`vegetariano`, `sin-gluten`, `nuevo`,
  `favorito`), `picante` (0 a 3), `alergenos`, `adicionales`, `estado: 'agotado'`,
  `tiempoLimitado: { hasta: 'AAAA-MM-DD' }`, `destacado` (con uno solo sale como "La estrella de la casa"), `oculto`
  (guardado pero fuera de la carta) y `conAdiciones` (su detalle muestra los productos de la categoría `adicionesDe`
  del menú, con sus precios: el precio de una adición se cambia en un solo sitio).
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
nota, el cupón ("¿Tienes un cupón?") y el botón que abre WhatsApp con el mensaje listo. Sin cuenta, la página no cobra
ni pide datos personales (la dirección se habla en el chat) y el pedido se guarda en el navegador solo por ese día.
Con cuenta del Club el pedido lleva su descuento, su dirección guardada y su nombre, y queda en su cuenta (ver *Club
Rootfire*). Con `pedidos: false` vuelve a ser un menú para ver. La lógica está en `src/app/pedido/` (con pruebas) y las
vistas en `src/app/secciones/pedido/`.

### Promos y banners de temporada
Se crean en el panel (`/admin` → *Promos y banners*): rótulo ("Promo de diciembre"), qué se ofrece, precio (sin precio
es un banner: un aviso de temporada con su afiche), plato y cuántos combos trae, condiciones, fechas y el **afiche**
(vertical, como una historia), que se sube desde ahí y queda en WebP de 1080 y 720 px. Se pueden dejar **programadas**:
cada una sale sola entre sus fechas (si se cruzan, la de más arriba de la lista) y se puede apagar sin borrarla.
La de `promocion` en la config es la primera que se carga en Firestore (sus campos: `id`, `etiqueta`, `titulo`,
`precio`, `detalle`, `nota`, `vigencia`, `afiche`, `platoId`, `cantidad`; `npm run promo` sigue preparando su afiche
desde `recursos/promos/<id>.png`). Mientras una promo esté vigente sale en tres sitios: la
ventana del afiche (sola, una vez al día por navegador y solo cuando el afiche ya cargó), el botón del inicio y un
sello en la tarjeta de su plato. El enlace
`https://…/?promo` abre la ventana de una vez: sirve para historias de Instagram y estados de WhatsApp. Fuera de las
fechas, o sin `promocion`, no sale nada.

### Panel de administración (`/admin`)
Entra la cuenta `adminEmail` de la config y las que se agreguen en *Club y ajustes* (Google, o correo y contraseña con el
correo verificado). Pestañas:

- **Pedidos:** los de clientes con cuenta del Club, en vivo (los demás llegan solo por WhatsApp). "Entregado" le suma
  el sello al cliente (y si canjeó el premio, le descuenta los sellos del premio); "Cancelado" no suma; "Deshacer" lo
  devuelve. Arriba: por atender, pedidos y lo entregado hoy.
- **Clientes:** buscar por nombre, celular o correo; sus datos, sus autorizaciones con fecha, sus pedidos, sumar o
  quitar sellos, quiénes cumplen años este mes y **Exportar CSV** (para Excel). Para mandar promociones, solo a quienes
  las aceptaron (columna "Promociones").
- **Menú y precios:** precios en la misma fila, agotado, ocultar, ordenar, borrar, y el editor de cada producto (con
  foto que se sube desde ahí, o el dibujo de la hamburguesa con sus capas). Categorías nuevas (postres, por ejemplo),
  cómo se ve cada una, qué incluye el combo, sus acompañamientos y la categoría de las adiciones.
- **Promos y banners** y **Cupones** (ver arriba y *Club Rootfire*).
- **Club y ajustes:** encender el Club, su descuento, su tarjeta de sellos y quién más entra al panel.

Menú, promos y Club se editan sobre un **borrador**: la página cambia al tocar **Publicar cambios** (la barra de abajo
avisa lo que falta publicar). Se guarda todo en un solo documento (`publico/carta`), que la página lee con un `fetch` a
la API REST de Firestore, sin cargar Firebase: una lectura por visita. Cupones, admins y sellos se guardan de una vez.

### Club Rootfire (registro opcional)
Arranca **apagado** (`club` en la config): el admin lo enciende en *Club y ajustes* con las condiciones que decida.
Mientras está apagado la página no invita a registrarse. Encendido:

- **Registro** en `/cuenta` (o `/club`): con Google o con correo y contraseña. Pide nombre y celular; cumpleaños (día y
  mes), dirección y barrio son opcionales. Para crear la cuenta hay que marcar la **autorización de tratamiento de
  datos** (obligatoria, con el aviso de privacidad al lado); la de **recibir promociones** va aparte y es opcional.
  Las dos quedan con la fecha del servidor y la versión de la política (`legal.version`) como prueba (Ley 1581).
  Quien entra pero no quiere registrarse ("No quiero registrarme") borra su cuenta de acceso.
- **Descuento** para registrados (porcentaje, solo el primer pedido o siempre, pedido mínimo). Se aplica solo en "Tu
  pedido" y va escrito en el mensaje de WhatsApp.
- **Tarjeta de sellos:** un sello por pedido entregado (lo marca el admin); con la meta, el premio, que el cliente
  marca en su siguiente pedido.
- **Cupones** (*Cupones* en el panel): porcentaje o valor fijo, fechas, pedido mínimo, solo para el Club y/o una vez
  por cliente. Se comparten en historias o por mensaje; el cliente los escribe en "Tu pedido". Un solo descuento por
  pedido (el cupón reemplaza al del Club) y nunca sobre los productos en promo. Nadie puede listar los cupones: se lee
  uno solo si se sabe el código.
- **Mi cuenta:** su tarjeta de sellos, sus pedidos, cambiar sus datos y la autorización de promociones, **descargar
  sus datos** (JSON) y **eliminar la cuenta** (borra perfil, pedidos y acceso).
- En el menú, quien tiene sesión ve "Pides como…", su descuento y su premio. Firebase se descarga después de pintar el
  menú y solo si en el navegador hay sesión (Firestore *lite*: ~57 KB); quien no tiene cuenta no descarga nada.

Lo que ve el cliente lo protegen las reglas, no la página: nadie se suma sellos, ni ve datos de otros, ni repite un
cupón de un solo uso, ni canjea el premio sin los sellos (ver *Seguridad*).

### Activar Firebase (una vez)
Sin la configuración web de Firebase la página funciona como antes (menú de `config/menu.ts`, sin Club ni panel).
Para encender todo, en la consola de Firebase del proyecto `rootfire-burgers`:

1. *Configuración del proyecto → Tus apps → Agregar app web*. Copia `apiKey`, `messagingSenderId` y `appId` a
   `firebase` en `src/app/config/clientes/rootfire.ts` (no son secretos: lo que protege los datos son las reglas).
2. *Authentication → Método de acceso*: activa **Google** y **Correo electrónico/contraseña**. En *Configuración →
   Dominios autorizados* deja `rootfire-burgers.web.app` (y el dominio propio cuando lo haya).
3. *Firestore Database → Crear base de datos* (modo producción; ubicación cercana, por ejemplo `southamerica-east1`).
4. *Storage → Comenzar* (pide el plan **Blaze**; con este uso no genera cobros, pero conviene poner una alerta de
   presupuesto). Sin Storage todo funciona menos subir fotos y afiches.
5. `firebase deploy --only firestore:rules,firestore:indexes,storage` y acepta el permiso que ofrece para que Storage
   lea la lista de admins de Firestore ("Grant the new role?"; sin él solo la cuenta principal sube imágenes).
6. `npm run build && firebase deploy --only hosting`, entra a `/admin` con la cuenta principal y toca **Publicar
   cambios**: la carta de los archivos queda en Firestore y desde ahí se edita en el panel.

Para probar antes sin tocar nada real: `npm run demo` (emuladores de Auth, Firestore y Storage con el proyecto
`demo-rootfire`, en http://localhost:4201; los datos se ven en http://127.0.0.1:4000). En el emulador, "Continuar con
Google" deja crear una cuenta de prueba: usa el correo de `adminEmail` para entrar al panel. Detén `npm start` antes
(los dos usan el puerto 4201).

### Privacidad, cookies y términos
- **`/politica-de-datos`** (Ley 1581 de 2012 y Decreto 1377 de 2013): la misma base de El Acicale, ajustada a los pedidos
  por WhatsApp y al Club, con la sección de cookies. **`/terminos`**: pedidos, precios, promociones, cupones, el Club
  (sus condiciones salen solas de lo que el admin tenga puesto), garantía y retracto (no aplica a comida: Ley 1480,
  art. 47). Enlaces en el pie de la página. **Faltan razón social, NIT y un correo** (`legal` en la config) y conviene
  que un abogado revise los dos textos antes de lanzar el Club.
- **Aviso de cookies** (`legal/aviso-cookies.component.ts`), igual al de El Acicale: "Aceptar todo", "Solo las
  necesarias" o "Elegir una por una", y "Preferencias de cookies" en el pie para cambiarlo. Lo necesario (el pedido,
  la sesión, la copia de la carta y la elección) no pide permiso. Lo único de terceros es el **mapa de Google**: aquí
  **solo carga con permiso** (en su lugar sale "Ver el mapa aquí"; "Cómo llegar" funciona igual). En El Acicale el
  negocio decidió mostrarlo siempre; si Rootfire lo prefiere así, basta con que `ConsentimientoService.mapa` sea
  `true`. No hay publicidad ni medición: si algún día se agrega (Meta Pixel, Analytics), va como otra opción del aviso.

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
- **Sin zone.js ni router:** el menú es una sola página. Las demás (`/politica-de-datos`, `/terminos`, `/cuenta`,
  `/admin`) se descargan solo al abrirlas, en dos paquetes (`src/app/paginas.ts`): políticas por un lado y cuenta +
  panel (con Firebase y los formularios de Angular) por el otro.
- **Carga inicial ≈ 122 KB transferidos** (JS 108 KB + CSS 13 KB) más dos fuentes precargadas (55 KB). Antes del Club
  eran 107 KB: ~6 KB son el aviso de cookies, la carta en línea y los cupones, y ~8 KB son el costo de partir el código
  para las páginas aparte. Se probó `@defer` para las secciones de abajo y transfería más (código partido en trozos que
  comprimen peor), así que no se usa. El presupuesto de `angular.json` subió a 525 KB (aviso) y 575 KB (error) sin
  comprimir.
- **La carta sin SDK:** la página lee `publico/carta` con un `fetch` a la API REST de Firestore (`firebase/rest.ts`)
  después de pintarse con la copia de la visita anterior: si el admin cambió algo, se ve al instante, y sin conexión
  sigue la copia. Firebase (~57 KB con Firestore *lite*) solo baja para quien tiene sesión del Club.
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
| `@firebase/rules-unit-testing` | Pruebas de las reglas en los emuladores (`npm run test:reglas`; usa la Firebase CLI instalada) |

En el menú solo va Angular (`core`, `common`, `platform-browser`, `service-worker`). `firebase` y `@angular/forms` van
solo en la cuenta y el panel (y Firebase *lite* para quien tiene sesión del Club). Sin librerías de animación: CSS,
`IntersectionObserver` y SVG.

## Seguridad
`firebase.json` deja listo Hosting con `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS,
`Cross-Origin-Opener-Policy` (`same-origin-allow-popups`, para la ventana de Google) y una CSP (`script-src 'self'` más
`apis.google.com` para entrar con Google, `connect-src` a `*.googleapis.com`, imágenes de Firebase Storage, `frame-src`
para Google Maps y la ventana de Firebase Auth). La CSP y el COOP no se aplican a `/__/…` (las páginas de Firebase para
entrar con Google). Si cambia el dominio o el `authDomain`, revisa `frame-src`.

**Reglas** (`firestore.rules` y `storage.rules`, probadas con `npm run test:reglas`: 79 casos de Firestore y 12 de
Storage; lo que la página hace funciona y cada abuso desde la consola falla):
- La carta, los cupones, los admins y las imágenes solo los escribe el admin (cuenta principal o lista `admins`, con el
  correo verificado). Los cupones se leen de a uno (si se sabe el código), nunca en lista.
- Cada cliente ve y cambia solo su perfil y sus pedidos. No se suma sellos, no cambia su correo ni la prueba de su
  autorización, y la fecha de la autorización la pone el servidor. El admin no puede tocar las autorizaciones.
- Un pedido solo lo crea un cliente registrado, a su nombre, "enviado", con el total = subtotal − descuento; un cupón
  de un solo uso exige crear en la misma escritura la marca de uso, que no se puede repetir ni borrar; el premio exige
  tener los sellos de la meta publicada. El admin solo cambia el estado.
- Storage: solo imágenes WebP o JPEG de menos de 3 MB en `publico/platos` y `publico/promos`.

Caché larga solo para archivos con hash. Proyecto de Firebase: `rootfire-burgers` (`.firebaserc`). **Publicado** en https://rootfire-burgers.web.app (última vez: 2026-10-09) (`npm run build && firebase deploy --only hosting`).
No hay llaves en el repositorio: la configuración web de Firebase (que no es secreta) se agrega al activar el Club
(ver *Activar Firebase*). Antes de publicar cambios en las reglas: `npm run test:reglas`, y
`firebase deploy --only firestore:rules,firestore:indexes,storage` antes que `--only hosting`.

## Diseño
- Marca: el **logotipo, el sello y los stickers oficiales** de la diseñadora de Rootfire, más la **cabecita de la
  mascota** hecha para la página (barra, inicio, favicon, íconos de la app, hoja impresa y centro del QR): en el inicio
  se mece, parpadea y sigue el mouse con los ojos. El logotipo de letras que se había propuesto al principio se retiró.
- Colores: base oscura (carbón cálido) con la **paleta oficial** encima: amarillo `#FFCB00` (botones con texto oscuro),
  naranja `#FF6006`, rojo `#D11813`, verde `#8CBD00`, verde oscuro `#005225` y crema `#FAE6CB`.
- Diseño y desarrollo · ProjectRyann (configurable en `firma`).
