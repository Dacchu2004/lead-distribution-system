/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      /**
       * Custom dark palette — deep navy tones for a professional admin aesthetic.
       * Each step is ~10% lighter, giving clear contrast between surfaces.
       * Usage: bg-dark-800 (page bg), bg-dark-700 (cards), bg-dark-600 (inputs)
       */
      colors: {
        dark: {
          900: '#060a14',
          800: '#0a0f1e',
          700: '#0f1628',
          600: '#141c35',
          500: '#1a2444',
          400: '#243058',
        },
        /**
         * accent = indigo (#6366f1) — used for CTAs, active states, focus rings.
         * hover = slightly darker indigo for button hover states.
         * light = lighter indigo for icon colors and subtle text.
         */
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          light: '#818cf8',
        },
      },
      /**
       * Custom fonts:
       * - Outfit: clean geometric sans-serif — used for all UI text
       * - JetBrains Mono: developer-grade monospace — used for numbers, codes, IDs
       * Both loaded from Google Fonts in index.html
       */
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      /**
       * Custom shadows:
       * - glow: indigo glow effect on accent elements (buttons, active nav)
       * - card: deep shadow for elevated card surfaces
       */
      boxShadow: {
        glow: '0 0 20px rgba(99, 102, 241, 0.25)',
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};