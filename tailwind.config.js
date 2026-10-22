/** @type {import('tailwindcss').Config} */

// Los colores y las fuentes los define cada cliente (src/app/config/clientes/*.ts). `npm run preparar`
// los escribe como variables CSS en src/tema.css; aquí solo se conectan con Tailwind.
const escala = (nombre, tonos = [100, 200, 300, 400, 500, 600, 700, 800, 900]) =>
  Object.fromEntries(tonos.map((t) => [t, `rgb(var(--${nombre}-${t}) / <alpha-value>)`]));

export default {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      screens: { xs: '400px' },
      fontFamily: {
        sans: ['var(--fuente-texto)'],
        display: ['var(--fuente-display)'],
      },
      colors: {
        // Carbón cálido: fondos, tarjetas y bordes
        fondo: escala('fondo', [100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        // Crema y kraft: texto y superficies de papel
        papel: escala('papel', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        // Brasa: el rojo de la marca
        primario: escala('primario'),
        // Llama: naranja
        secundario: escala('secundario'),
        // Chispa: amarillo para botones principales, precios y resaltados
        destello: escala('destello'),
        // Raíz: verde para lo vegetariano
        fresco: escala('fresco'),
        'sobre-destello': 'rgb(var(--sobre-destello) / <alpha-value>)',
        'sobre-primario': 'rgb(var(--sobre-primario) / <alpha-value>)',
      },
      spacing: {
        barra: 'var(--alto-barra)',
        'seguro-abajo': 'env(safe-area-inset-bottom)',
      },
      keyframes: {
        desfile: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        girar: { to: { transform: 'rotate(360deg)' } },
        latido: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '.35' } },
      },
      animation: {
        desfile: 'desfile var(--duracion, 40s) linear infinite',
        girar: 'girar 30s linear infinite',
        latido: 'latido 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
