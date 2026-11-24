import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          900: 'rgb(var(--color-navy-900) / <alpha-value>)',
          700: 'rgb(var(--color-navy-700) / <alpha-value>)',
        },
        brand: {
          blue: 'rgb(var(--color-brand-blue) / <alpha-value>)',
        },
        blue: {
          500: 'rgb(var(--color-blue-500) / <alpha-value>)',
        },
        sky: {
          100: 'rgb(var(--color-sky-100) / <alpha-value>)',
        },
        emerald: {
          500: 'rgb(var(--color-emerald-500) / <alpha-value>)',
        },
        amber: {
          400: 'rgb(var(--color-amber-400) / <alpha-value>)',
        },
        rose: {
          500: 'rgb(var(--color-rose-500) / <alpha-value>)',
        },
        slate: {
          50: 'rgb(var(--color-slate-50) / <alpha-value>)',
          200: 'rgb(var(--color-slate-200) / <alpha-value>)',
          700: 'rgb(var(--color-slate-700) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Poppins"', 'system-ui', 'sans-serif'],
        devanagari: ['"Noto Sans Devanagari"', 'sans-serif'],
      },
      borderRadius: {
        input: 'var(--radius-input)',
        card: 'var(--radius-card)',
        hero: 'var(--radius-hero)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        lifted: 'var(--shadow-lifted)',
      },
      maxWidth: {
        content: 'var(--max-content)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-gentle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.5s ease-out',
        'pulse-gentle': 'pulse-gentle 2s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
