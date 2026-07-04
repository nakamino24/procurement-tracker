/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palet "meja kerja pengadaan": biru tinta dokumen + amber stempel
        ink: {
          50: '#f4f6f8',
          100: '#e4e9ee',
          400: '#5b7285',
          600: '#31485c',
          800: '#1c2e3d',
          900: '#101c26',
        },
        stamp: {
          500: '#c17f2c',
          600: '#a2691f',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
