import colors from 'tailwindcss/colors';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { brand: colors.teal, ink: { DEFAULT: '#0b1320', 800: '#111c2e', 700: '#1a2840' } },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', '"Segoe UI"', 'sans-serif'],
        mono: ['ui-monospace', '"JetBrains Mono"', '"Cascadia Code"', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,.04), 0 6px 20px -6px rgba(15,23,42,.10)',
        lift: '0 2px 4px rgba(15,23,42,.05), 0 14px 32px -10px rgba(15,23,42,.18)',
        pop: '0 20px 60px -15px rgba(2,6,23,.45)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'pop-in': { from: { opacity: 0, transform: 'scale(.96)' }, to: { opacity: 1, transform: 'scale(1)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in .15s ease-out',
        'slide-up': 'slide-up .25s ease-out',
        'pop-in': 'pop-in .18s ease-out',
      },
    },
  },
  plugins: [],
};
