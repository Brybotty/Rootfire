// Arma el .zip para subir a Hostinger (Administrador de archivos → public_html → Subir → Extraer).
// Lleva todo dist/rootfire-burgers/browser, .htaccess incluido, con rutas de barra normal (el Compress-Archive de
// PowerShell 5 las escribe con "\" y al extraer en Linux quedan archivos con nombres como "platos\la-casual.webp").
// Uso: npm run build && npm run paquete      (queda en publicar/)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cargarConfig } from './lib/config.mjs';

const { CLIENTE } = await cargarConfig();
const RAIZ = resolve(import.meta.dirname, '..');
const DIST = join(RAIZ, 'dist/rootfire-burgers/browser');
const SALIDA = join(RAIZ, 'publicar');

for (const archivo of ['index.html', '.htaccess', 'ngsw.json']) {
  if (!existsSync(join(DIST, archivo))) {
    console.error(`Falta dist/…/${archivo}. Corre primero: npm run build`);
    process.exit(1);
  }
}

const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const zip = join(SALIDA, `${CLIENTE.id}-${fecha}.zip`);
mkdirSync(SALIDA, { recursive: true });
rmSync(zip, { force: true });

// El tar de Windows (bsdtar) escribe zip; el de Git Bash (GNU tar) no.
const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:/Windows', 'System32/tar.exe') : 'bsdtar';
const entradas = readdirSync(DIST);
const r = spawnSync(tar, ['-a', '-c', '-f', zip, '-C', DIST, ...entradas], { stdio: 'inherit' });
if (r.status !== 0) {
  console.error('No se pudo crear el zip.');
  process.exit(1);
}
const lista = spawnSync(tar, ['-t', '-f', zip], { encoding: 'utf8' }).stdout.split(/\r?\n/).filter(Boolean);
const conBarraInvertida = lista.filter((e) => e.includes('\\'));
if (!lista.includes('.htaccess') || conBarraInvertida.length) {
  console.error(`El zip quedó mal: ${!lista.includes('.htaccess') ? 'sin .htaccess' : conBarraInvertida.slice(0, 3).join(', ')}`);
  process.exit(1);
}
const archivos = lista.filter((e) => !e.endsWith('/')).length;
console.log(`\n  ${zip}\n  ${archivos} archivos, ${(statSync(zip).size / 1024 / 1024).toFixed(1)} MB, .htaccess incluido.`);
console.log(`\nEn Hostinger: Administrador de archivos → public_html de ${new URL(CLIENTE.sitio.url).hostname} → borrar default.php`);
console.log('→ Subir este zip → clic derecho → Extraer (en public_html, no en una carpeta nueva) → borrar el zip.');
console.log('Después: npm run revisar:sitio');
