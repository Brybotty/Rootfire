"""
Extrae los assets oficiales de Rootfire desde los archivos de Illustrator de la diseñadora
(recursos/originales/ASSETS ROOTFIRE.ai y MENÚ RGB.ai, que son compatibles con PDF):

  src/app/marca/oficial.ts         logotipos como trazos (se pintan con el color del texto)
  src/app/marca/stickers.ts        lista de stickers con su tamaño
  public/stickers/<nombre>.svg     cada sticker por separado, en vector
  public/marca/sello-*.svg         el sello (anillo de texto y parrillero), en amarillo
  public/platos/<plato>.webp       las hamburguesas recortadas (con transparencia), en dos tamaños
  recursos/marca/*.svg             logotipos y sello sueltos en rojo y amarillo, para imprenta y redes
  recursos/stickers-hoja.png       hoja numerada de los stickers (los nombres van en stickers.json)

Solo hace falta correrlo si la diseñadora cambia los archivos:
  python -m venv .venv
  .venv\\Scripts\\pip install pymupdf pillow
  .venv\\Scripts\\python scripts/assets/extraer.py
"""
import io
import json
import os
import unicodedata

import pymupdf
from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
ORIGINALES = os.path.join(RAIZ, 'recursos', 'originales')
AMARILLO = '#FFCB00'


def ruta(*partes):
    destino = os.path.join(RAIZ, *partes)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    return destino


def escribir(destino, texto):
    with open(destino, 'w', encoding='utf8', newline='\n') as archivo:
        archivo.write(texto)


def original(prefijo):
    """Busca por prefijo sin tildes (los nombres vienen de macOS con las tildes descompuestas)."""
    limpio = lambda t: ''.join(c for c in unicodedata.normalize('NFD', t) if not unicodedata.combining(c)).lower()
    for nombre in os.listdir(ORIGINALES):
        if limpio(nombre).startswith(limpio(prefijo)):
            return os.path.join(ORIGINALES, nombre)
    raise SystemExit(f'No encontré "{prefijo}" en {ORIGINALES}')


def hexa(color):
    return '#%02X%02X%02X' % tuple(round(v * 255) for v in color)


def numeros(valores):
    """'3 -4 5' → '3-4 5' (sin espacio antes de los negativos)."""
    texto = ''
    for i, v in enumerate(valores):
        t = str(v)
        texto += t if i == 0 or t.startswith('-') else ' ' + t
    return texto


def trazo(dibujo, dx=0.0, dy=0.0, escala=1.0):
    """
    Convierte un trazo de PyMuPDF en el atributo `d` de un <path>, con coordenadas enteras y relativas
    (pesa menos de la mitad que con decimales absolutos). Los deltas salen de posiciones ya redondeadas:
    el error no se acumula.
    """
    partes = []
    actual = None  # punto actual, ya redondeado
    r = lambda p: (round((p.x - dx) * escala), round((p.y - dy) * escala))
    for item in dibujo['items']:
        tipo = item[0]
        if tipo in ('re', 'qu'):
            if tipo == 're':
                c = item[1]
                esquinas = [pymupdf.Point(c.x0, c.y0), pymupdf.Point(c.x1, c.y0), pymupdf.Point(c.x1, c.y1), pymupdf.Point(c.x0, c.y1)]
            else:
                q = item[1]
                esquinas = [q.ul, q.ur, q.lr, q.ll]
            if actual is not None:
                partes.append('z')
            puntos = [r(p) for p in esquinas]
            partes.append('M' + numeros(puntos[0]))
            for a, b in zip(puntos, puntos[1:]):
                partes.append('l' + numeros((b[0] - a[0], b[1] - a[1])))
            partes.append('z')
            actual = None
            continue
        inicio, fin = r(item[1]), r(item[-1])
        if actual is None or inicio != actual:
            if actual is not None:
                partes.append('z')
            partes.append('M' + numeros(inicio))
            actual = inicio
        if tipo == 'l':
            if fin != actual:
                partes.append('l' + numeros((fin[0] - actual[0], fin[1] - actual[1])))
        elif tipo == 'c':
            c1, c2 = r(item[2]), r(item[3])
            partes.append('c' + numeros((c1[0] - actual[0], c1[1] - actual[1], c2[0] - actual[0], c2[1] - actual[1], fin[0] - actual[0], fin[1] - actual[1])))
        actual = fin
    if actual is not None:
        partes.append('z')
    return ''.join(partes)


def caja(dibujos):
    total = pymupdf.Rect(dibujos[0]['rect'])
    for d in dibujos[1:]:
        total |= d['rect']
    return total


def svg(dibujos, margen=2.0, color=None, escala=4.0, marco=None):
    """SVG suelto de un grupo de trazos. Con `color`, todo se pinta de ese color. `marco` fija la caja."""
    total = marco or caja(dibujos)
    dx, dy = total.x0 - margen, total.y0 - margen
    ancho, alto = round((total.width + margen * 2) * escala), round((total.height + margen * 2) * escala)
    # Un <path> por trazo (si se unen, donde se superponen la regla de relleno abre huecos); los seguidos
    # del mismo color comparten un <g fill>.
    tramos = []
    for d in sorted(dibujos, key=lambda d: d['seqno']):
        relleno = color or hexa(d['fill'])
        if not tramos or tramos[-1][0] != relleno:
            tramos.append((relleno, []))
        tramos[-1][1].append(f'<path d="{trazo(d, dx, dy, escala)}"/>')
    cuerpo = ''.join(f'<g fill="{c}">{"".join(caminos)}</g>' for c, caminos in tramos)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} {alto}">{cuerpo}</svg>', ancho, alto


# ————————————————————————————————————————— Logotipos, sello y paleta
assets = pymupdf.open(original('ASSETS'), filetype='pdf')

ts = [
    '/**',
    ' * Marca oficial de Rootfire Burgers (archivo ASSETS ROOTFIRE.ai de su diseñadora).',
    ' * Generado por scripts/assets/extraer.py: no editar a mano.',
    ' * Son trazos sin color propio: cada componente los pinta con el color del texto (currentColor).',
    ' */',
]

paleta = [hexa(d['fill']) for d in sorted(assets[3].get_drawings(), key=lambda d: (round(d['rect'].y0 / 100), d['rect'].x0))]
ts.append('/** Amarillo, naranja, rojo, verde, verde oscuro y crema. */')
ts.append(f'export const PALETA_OFICIAL = {json.dumps(paleta)} as const;')
print('paleta:', paleta)

for clave, indice in (('linea', 0), ('apilado', 2)):
    dibujos = assets[indice].get_drawings()
    total = caja(dibujos)
    # "burgers" va abajo, en letras finas mucho más bajas que las del nombre.
    alto_max = max(d['rect'].height for d in dibujos)
    burgers = [d for d in dibujos if d['rect'].height < alto_max * 0.45 and d['rect'].y0 > total.y0 + total.height * 0.6]
    nombre = [d for d in dibujos if d not in burgers]
    escala = 1000 / total.width
    union = lambda grupo: ''.join(trazo(d, total.x0, total.y0, escala) for d in sorted(grupo, key=lambda d: d['seqno']))
    alto_nombre = round(caja(nombre).height * escala)
    ts.append(f'/** Logotipo {"en una línea" if clave == "linea" else "apilado"}: el nombre y "burgers" por separado. */')
    ts.append(
        f"export const LOGO_{clave.upper()} = {{ ancho: 1000, alto: {round(total.height * escala)}, altoNombre: {alto_nombre}, "
        f"nombre: '{union(nombre)}', burgers: '{union(burgers)}' }} as const;"
    )
    escribir(ruta('recursos', 'marca', f'logo-{clave}.svg'), svg(dibujos)[0])
    escribir(ruta('recursos', 'marca', f'logo-{clave}-amarillo.svg'), svg(dibujos, color=AMARILLO)[0])
    print(f'logo {clave}: {len(nombre)} trazos del nombre y {len(burgers)} de "burgers"')

# Sello: el parrillero en el centro y el texto "Rootfire • Rootfire •" alrededor (dos archivos con la misma
# caja, para que el anillo pueda girar solo).
sello = assets[1].get_drawings()
total = caja(sello)
cx, cy = total.x0 + total.width / 2, total.y0 + total.height / 2
radio = min(total.width, total.height) / 2
adentro = lambda d: (((d['rect'].x0 + d['rect'].x1) / 2 - cx) ** 2 + ((d['rect'].y0 + d['rect'].y1) / 2 - cy) ** 2) ** 0.5 < radio * 0.62
lado = max(total.width, total.height)
marco = pymupdf.Rect(cx - lado / 2, cy - lado / 2, cx + lado / 2, cy + lado / 2)
for nombre_archivo, grupo in (('sello-anillo', [d for d in sello if not adentro(d)]), ('sello-centro', [d for d in sello if adentro(d)])):
    escribir(ruta('public', 'marca', f'{nombre_archivo}.svg'), svg(grupo, color=AMARILLO, escala=2.0, marco=marco)[0])
    print(f'{nombre_archivo}: {len(grupo)} trazos')
escribir(ruta('recursos', 'marca', 'sello.svg'), svg(sello, marco=marco)[0])

escribir(ruta('src', 'app', 'marca', 'oficial.ts'), '\n'.join(ts) + '\n')
print('src/app/marca/oficial.ts:', round(os.path.getsize(ruta('src', 'app', 'marca', 'oficial.ts')) / 1024, 1), 'KB')

# ————————————————————————————————————————— Stickers
NOMBRES = json.load(open(os.path.join(AQUI, 'stickers.json'), encoding='utf8'))

pagina = assets[4]
dibujos = pagina.get_drawings()
amarillos = [d for d in dibujos if hexa(d['fill']) == AMARILLO]
# Semillas: las siluetas amarillas que no están dentro de otra silueta amarilla.
semillas = [a for a in amarillos if not any(b is not a and b['rect'].contains(a['rect']) and b['rect'].get_area() > a['rect'].get_area() for b in amarillos)]
grupos = {s['seqno']: [s] for s in semillas}
for d in dibujos:
    if d['seqno'] in grupos:
        continue
    centro = pymupdf.Point((d['rect'].x0 + d['rect'].x1) / 2, (d['rect'].y0 + d['rect'].y1) / 2)
    candidatas = [s for s in semillas if s['rect'].contains(centro)]
    if not candidatas:
        candidatas = sorted(semillas, key=lambda s: abs((s['rect'].x0 + s['rect'].x1) / 2 - centro.x) + abs((s['rect'].y0 + s['rect'].y1) / 2 - centro.y))[:1]
    # Si cae dentro de dos siluetas, es de la que se dibujó justo antes (orden de capas).
    anteriores = [s for s in candidatas if s['seqno'] < d['seqno']] or candidatas
    grupos[max(anteriores, key=lambda s: s['seqno'])['seqno']].append(d)

# Orden de lectura: por filas (centros a menos de 60 puntos de distancia vertical) y de izquierda a derecha.
medio = lambda g: caja(g).y0 + caja(g).height / 2
lista = sorted(grupos.values(), key=medio)
filas, fila = [], []
for g in lista:
    if fila and medio(g) - medio(fila[-1]) > 60:
        filas.append(sorted(fila, key=lambda g: caja(g).x0))
        fila = []
    fila.append(g)
filas.append(sorted(fila, key=lambda g: caja(g).x0))
ordenados = [g for f in filas for g in f]
print(f'stickers: {len(ordenados)} en {len(filas)} filas')

# Hoja numerada (para revisar los nombres de stickers.json)
pix = pagina.get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6), alpha=False)
hoja = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
lapiz = ImageDraw.Draw(hoja)
for i, g in enumerate(ordenados):
    c = caja(g)
    lapiz.rectangle([c.x0 * 1.6, c.y0 * 1.6, c.x1 * 1.6, c.y1 * 1.6], outline=(0, 90, 200), width=1)
    lapiz.rectangle([c.x0 * 1.6, c.y0 * 1.6, c.x0 * 1.6 + 30, c.y0 * 1.6 + 18], fill=(0, 90, 200))
    lapiz.text((c.x0 * 1.6 + 4, c.y0 * 1.6 + 3), str(i), fill=(255, 255, 255))
hoja.save(ruta('recursos', 'stickers-hoja.png'))

# Varios números con el mismo nombre se unen en un solo sticker (los dos destellos).
por_nombre = {}
for i, g in enumerate(ordenados):
    nombre = NOMBRES.get(str(i))
    if nombre:
        por_nombre.setdefault(nombre, []).extend(g)

carpeta = os.path.dirname(ruta('public', 'stickers', 'x'))
for viejo in os.listdir(carpeta):
    if viejo.endswith('.svg'):
        os.remove(os.path.join(carpeta, viejo))
tamanos, peso = {}, 0
for nombre, g in por_nombre.items():
    contenido, ancho, alto = svg(g, margen=1.5)
    escribir(os.path.join(carpeta, f'{nombre}.svg'), contenido)
    tamanos[nombre] = [ancho, alto]
    peso += len(contenido)
print(f'{len(tamanos)} stickers → public/stickers ({peso / 1024:.0f} KB en total, {peso / 1024 / len(tamanos):.1f} KB en promedio)')
escribir(
    ruta('src', 'app', 'marca', 'stickers.ts'),
    '/**\n * Stickers oficiales de Rootfire (public/stickers/<nombre>.svg) con su ancho y alto.\n'
    ' * Generado por scripts/assets/extraer.py: no editar a mano.\n */\n'
    'export const STICKERS = {\n'
    + ''.join(f"  '{k}': [{v[0]}, {v[1]}],\n" for k, v in sorted(tamanos.items()))
    + '} as const;\n\nexport type NombreSticker = keyof typeof STICKERS;\n',
)

# ————————————————————————————————————————— Fotos de las hamburguesas (recortes del menú)
# Cada recorte se reconoce por su posición en la página larga del menú (página 2 del archivo).
PLATOS = {'ron-y-bacon': (51, 363), 'la-clasica': (305, 374), 'root-burger': (58, 735), 'la-casual': (58, 920), 'la-madurita': (298, 906)}
menu = pymupdf.open(original('MENU'), filetype='pdf')
larga = menu[2]
fotos = {}
for img in larga.get_images(full=True):
    xref, mascara = img[0], img[1]
    for rect in larga.get_image_rects(xref):
        for plato, (x, y) in PLATOS.items():
            if abs(rect.x0 - x) < 3 and abs(rect.y0 - y) < 3:
                pix = pymupdf.Pixmap(menu, xref)
                if mascara:
                    pix = pymupdf.Pixmap(pix, pymupdf.Pixmap(menu, mascara))
                im = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGBA')
                im = im.crop(im.getchannel('A').getbbox())
                # Lienzo 5:4 con la hamburguesa centrada y apoyada abajo: todas quedan igual en las tarjetas.
                lado = max(im.width, int(im.height * 1.25))
                lienzo = Image.new('RGBA', (lado, int(lado * 0.8)), (0, 0, 0, 0))
                lienzo.paste(im, ((lado - im.width) // 2, lienzo.height - im.height), im)
                fotos[plato] = {}
                for sufijo, ancho in (('', 960), ('-480', 480)):
                    copia = lienzo.resize((ancho, int(ancho * 0.8)), Image.LANCZOS)
                    destino = ruta('public', 'platos', f'{plato}{sufijo}.webp')
                    copia.save(destino, 'WEBP', quality=84, method=6)
                    fotos[plato][ancho] = round(os.path.getsize(destino) / 1024)
print('fotos (KB por tamaño):', fotos)
if len(fotos) != len(PLATOS):
    raise SystemExit('Faltan fotos: revisa las posiciones en PLATOS')
