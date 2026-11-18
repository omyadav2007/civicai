/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        civic: {
          navy: {
            50: '#f0f5fa',
            100: '#e1ecf5',
            200: '#c3d8eb',
            300: '#94bcdd',
            400: '#5e9bcc',
            500: '#387cba',
            600: '#27629c',
            700: '#204f7f',
            800: '#1d436b',
            900: '#0f2744',
            950: '#0a192d',
          },
          teal: {
            50: '#f0fdfa',
            100: '#ccfbf1',
            200: '#99f6e4',
            300: '#5eead4',
            400: '#2dd4bf',
            500: '#14b8a6',
            600: '#0d9488',
            700: '#0f766e',
            800: '#115e59',
            900: '#134e4a',
          },
        },
      },
    },
  },
  plugins: [],
};
