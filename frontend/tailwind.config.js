/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        accora: {
          50: '#f8f7ff',
          100: '#f0eeff',
          200: '#e1dcfe',
          300: '#cabefd',
          400: '#ab95fa',
          500: '#8c67f6',
          600: '#7545ed',
          700: '#6432d7',
          800: '#5328b4',
          900: '#452393',
          950: '#291261',
        },
        surface: {
          light: '#ffffff',
          dark: '#0e0e17',
          darkcard: '#161626',
          darkborder: '#2a2842',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
