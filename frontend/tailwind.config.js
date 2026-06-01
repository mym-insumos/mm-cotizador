/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        chess: {
          dark:    '#1a1a2e',
          panel:   '#16213e',
          accent:  '#0f3460',
          gold:    '#e2b96f',
          light:   '#f0d9b5',
          green:   '#4caf50',
          danger:  '#ef5350',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
