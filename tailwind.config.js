/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Design tokens from notes/design-demos (direction C + A, chosen 2026-10-31).
      colors: {
        ink: '#001435',
        muted: '#55657D',
        canvas: '#F5F7FA',
        line: '#E3E8EF',
        brand: { DEFAULT: '#0070E0', dark: '#005CC0', soft: '#E6F0FC' },
        success: { DEFAULT: '#0A7F4F', soft: '#E5F4EC' },
      },
    },
  },
  plugins: [],
};
