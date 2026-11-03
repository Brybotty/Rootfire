// Encabezados del sitio publicado: una sola fuente para la sección `hosting` de firebase.json (donde vive el sitio,
// con el dominio propio conectado), para el .htaccess (por si algún día se pasa a Hostinger u otro Apache/LiteSpeed) y
// para el servidor local de npm run revisar. Los dos archivos los reescribe preparar.mjs en cada build.
//
// - Seguridad en todas las respuestas.
// - CSP y COOP solo en las páginas (index.html): el service worker va sin CSP, porque un service worker pasa por fetch()
//   todo lo que pide la página y con `connect-src 'self'` bloqueaba la carta de Firestore y la ventana de Google
//   (fallo en producción del 2026-10-22).
// - Caché: un año para lo que lleva hash en el nombre; "no-cache" para las páginas y los archivos del service worker.

/** Content-Security-Policy de las páginas. Firebase (carta, cuenta y panel) y el mapa de Google. */
export function csp(cliente) {
  const auth = cliente.firebase?.authDomain;
  return [
    "default-src 'self'",
    // apis.google.com: la ventana para entrar con Google.
    "script-src 'self' https://apis.google.com",
    "style-src 'self' 'unsafe-inline'",
    // Fotos y afiches que sube el panel.
    "img-src 'self' data: https://firebasestorage.googleapis.com",
    "font-src 'self'",
    // Firestore, Auth y Storage.
    "connect-src 'self' https://*.googleapis.com",
    // El mapa y el iframe de Firebase Auth (en authDomain).
    `frame-src 'self' https://www.google.com https://maps.google.com${auth ? ` https://${auth}` : ''}`,
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export const SEGURIDAD = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  'Strict-Transport-Security': 'max-age=31536000',
};

/** Solo las páginas (más la CSP). `same-origin-allow-popups`: la ventana de Google para entrar tiene que poder responder. */
export const PAGINA = { 'Cache-Control': 'no-cache', 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' };

/**
 * Caché por nombre de archivo (no por ruta). Si dos reglas calzan, gana la última, igual que en el .htaccess.
 * El hash de Angular son 8 letras mayúsculas o cifras: `main-GRUS2QJ3.js` sí, `ngsw-worker.js` no.
 */
export const CACHE = [
  { archivo: /\.(jpe?g|png|webp|avif|svg|ico|txt|xml)$/, valor: 'public, max-age=86400' },
  { archivo: /\.woff2$/, valor: 'public, max-age=2592000' },
  { archivo: /-[A-Z0-9]{8}\.(js|css)$/, valor: 'public, max-age=31536000, immutable' },
  { archivo: /^(ngsw-worker\.js|safety-worker\.js|worker-basic\.min\.js|ngsw\.json|manifest\.webmanifest)$/, valor: 'no-cache' },
];

/** Las rutas sin extensión son páginas de la app (/cuenta, /admin, /terminos…): las sirve index.html. */
export const esPagina = (ruta) => !/\.[a-z0-9]+$/i.test(ruta) || ruta.endsWith('/index.html');

/** Los encabezados que lleva una ruta (para el servidor local de la revisión). */
export function encabezadosDe(ruta, cliente) {
  const archivo = esPagina(ruta) ? 'index.html' : ruta.split('/').pop();
  const salida = { ...SEGURIDAD };
  for (const regla of CACHE) if (regla.archivo.test(archivo)) salida['Cache-Control'] = regla.valor;
  if (archivo === 'index.html') Object.assign(salida, PAGINA, { 'Content-Security-Policy': csp(cliente) });
  return salida;
}

/**
 * La sección `hosting` de firebase.json. En Firebase un `regex` tiene que calzar con la ruta COMPLETA y, si dos reglas
 * ponen el mismo encabezado, gana la última. Todo va con `regex`: en el emulador de Hosting las reglas `source` (glob)
 * no se aplicaron (2026-11-03).
 */
export function hostingFirebase(cliente) {
  // Las reglas de CACHE miran el nombre del archivo; aquí, la ruta entera.
  const deRuta = (r) => (r.source.startsWith('^') ? `^/(?:.*/)?${r.source.slice(1)}` : `^/(?:.*/)?[^/]*${r.source}`);
  const lista = (encabezados) => Object.entries(encabezados).map(([key, value]) => ({ key, value }));
  return {
    public: 'dist/rootfire-burgers/browser',
    ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
    // Las páginas (rutas sin punto) las arma la app; un archivo que no existe da 404, no la página.
    rewrites: [{ regex: '^/[^.]*$', destination: '/index.html' }],
    headers: [
      { regex: '^/.*$', headers: lista(SEGURIDAD) },
      ...CACHE.map((r) => ({ regex: deRuta(r.archivo), headers: lista({ 'Cache-Control': r.valor }) })),
      // Las páginas, nunca /__/ (las de Firebase para entrar con Google, en el authDomain).
      { regex: '^/(index\\.html|[^_.][^.]*|_[^_.][^.]*)?$', headers: lista({ ...PAGINA, 'Content-Security-Policy': csp(cliente) }) },
    ],
  };
}

/**
 * El .htaccess para Hostinger (LiteSpeed, compatible con Apache 2.4). Hoy el sitio va en Firebase: Firebase no sube
 * archivos ocultos, así que este no estorba. `dominio` es el de sitio.url: solo ahí se fuerza
 * HTTPS y se quita el www, así la dirección de prueba de Hostinger y un Apache local sirven sin redirigir.
 */
export function htaccess(cliente) {
  const dominio = new URL(cliente.sitio.url).hostname.replace(/^www\./, '');
  const exp = dominio.replace(/\./g, '\\.');
  const comillas = (v) => `"${v.replace(/"/g, '\\"')}"`;
  const bloque = (regex, encabezados) =>
    `  <FilesMatch "${regex}">\n${Object.entries(encabezados)
      .map(([k, v]) => `    Header set ${k} ${comillas(v)}`)
      .join('\n')}\n  </FilesMatch>`;
  return `# Generado por scripts/preparar.mjs (scripts/lib/encabezados.mjs y la config del cliente). No editar a mano.
# Hostinger: va en public_html junto con el resto de dist/rootfire-burgers/browser.

DirectoryIndex index.html
Options -Indexes
AddDefaultCharset utf-8

<IfModule mod_mime.c>
  AddType text/javascript .js .mjs
  AddType application/manifest+json .webmanifest
  AddType image/webp .webp
  AddType image/svg+xml .svg
  AddType font/woff2 .woff2
  AddCharset utf-8 .js .css .json .webmanifest .svg .txt .xml
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On

  # Siempre https://${dominio}, sin www.
  RewriteCond %{HTTP_HOST} ^(www\\.)?${exp}$ [NC]
  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP:X-Forwarded-Proto} !=https
  RewriteRule ^ https://${dominio}%{REQUEST_URI} [R=301,L,NE]
  RewriteCond %{HTTP_HOST} ^www\\.${exp}$ [NC]
  RewriteRule ^ https://${dominio}%{REQUEST_URI} [R=301,L,NE]

  # Nada de archivos ocultos (.git, .env…), salvo .well-known (certificados).
  RewriteRule (^|/)\\.(?!well-known/) - [F,L]

  # Las páginas (rutas sin extensión) las arma la app. Un archivo que no existe da 404, no la página.
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_URI} !\\.[a-zA-Z0-9]+$
  RewriteRule ^ index.html [L]
</IfModule>

<IfModule mod_headers.c>
${Object.entries(SEGURIDAD)
  .map(([k, v]) => `  Header always set ${k} ${comillas(v)}`)
  .join('\n')}

  # Caché (si dos bloques calzan, gana el de más abajo).
${CACHE.map((r) => bloque(r.archivo.source, { 'Cache-Control': r.valor })).join('\n')}

  # Las páginas: todas salen de index.html.
${bloque('\\.html$', { ...PAGINA, 'Content-Security-Policy': csp(cliente) })}
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json application/manifest+json image/svg+xml text/plain application/xml
</IfModule>
`;
}
