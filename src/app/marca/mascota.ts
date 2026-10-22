/**
 * Trazos de la cabecita de la mascota de Rootfire (cabeza de llama con cejas inclinadas, ojos ovalados y
 * sonrisa de lado), en una caja de 100 x 112. Es la versión propia de la página: a diferencia de los stickers
 * oficiales, se puede animar (parpadea, se mece y sigue el mouse con los ojos).
 * La usan el componente app-mascota y los scripts de Node (favicon, íconos, QR): este archivo no importa nada.
 */
export const MASCOTA = {
  ancho: 100,
  alto: 112,
  contorno:
    'M50 108C27 108 12 92.5 12 71.5 12 59 16.4 50.2 21.6 43.8 16.6 42.5 12.8 38.8 10.8 33 16.6 35.4 21.6 36 25.4 35.4 23.2 28.4 23 20.6 25.6 12.4 28.6 19.8 33 24.2 37.4 25.6 36.6 16.6 39.6 8.4 46.6 1.8 47.4 10.6 51.2 17.6 56.4 21.2 58.6 15.8 62.6 11.8 68.4 9.6 66.8 16.6 68.4 23 72.2 28 77 25.6 82.2 24.8 88.4 25.6 84.6 30.8 83.2 36.4 84.2 42.6 87.8 43.4 90.6 45.4 92.8 48.6 89.4 53.2 88 60 88 71.5 88 92.5 73 108 50 108Z',
  // Llama interior más clara: da volumen sin depender de degradados (se ve bien a 16 px).
  interior:
    'M50 100.5C33.6 100.5 21.5 89 21.5 73 21.5 61.4 27.6 52.6 34.6 47.6 34.8 52.2 36.8 55.6 40.2 57.4 40 48 43.4 40.2 51.2 33.4 51 41.4 54.4 47.8 60.6 51.2 62.8 47.8 66.4 45.8 71 45.4 69.8 49.8 70.6 54 73.6 57.6 77.2 62.4 78.5 67.4 78.5 73 78.5 89 66.4 100.5 50 100.5Z',
  ojos: ['M40.2 63.6c2.5 0 4.3 2.9 4.3 6.6s-1.8 6.6-4.3 6.6-4.3-2.9-4.3-6.6 1.8-6.6 4.3-6.6Z', 'M60.6 63.6c2.5 0 4.3 2.9 4.3 6.6s-1.8 6.6-4.3 6.6-4.3-2.9-4.3-6.6 1.8-6.6 4.3-6.6Z'],
  brillos: ['M41.6 66.4a1.3 1.3 0 1 0 0 .01Z', 'M62 66.4a1.3 1.3 0 1 0 0 .01Z'],
  cejas: 'M32.6 56.4c4.2-.4 8.6.8 12.6 3.4M68.4 56.4c-4.2-.4-8.6.8-12.6 3.4',
  sonrisa: 'M35.4 82.4c4.4 6.4 10.2 8.8 16.4 8.2 5.6-.6 10-3.6 13.4-9.6',
} as const;
