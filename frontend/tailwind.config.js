/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        sidebar: {
          bg: '#0b1120',
          hover: 'rgba(245, 158, 11, 0.08)',
          active: 'rgba(245, 158, 11, 0.14)',
          border: 'rgba(148, 163, 184, 0.08)',
          text: '#94a3b8',
          'text-active': '#f1f5f9',
        },
        brand: {
          amber: '#f59e0b',
          'amber-light': '#fbbf24',
          orange: '#f97316',
          navy: '#0b1120',
          slate: '#0f172a',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(245,158,11,0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(245,158,11,0.4)' },
        },
      },
      boxShadow: {
        'sidebar': '4px 0 24px -2px rgba(0, 0, 0, 0.3)',
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -2px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
