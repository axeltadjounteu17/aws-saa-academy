import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF9900',
          hover: '#e88a00',
          dark: '#cc7a00',
        },
        // Les couleurs « var(--…) » s'adaptent au thème (voir :root et .dark dans index.css).
        background: {
          dark: '#09090b',
          darker: 'var(--color-subtle)',
          darkest: '#131315',
          light: '#f4f4f6',
          lighter: '#ffffff',
        },
        surface: {
          dark: '#131316',
          light: '#ffffff',
        },
        border: {
          dark: '#2e2e33',
          light: '#d4d4d8',
        },
        text: {
          primary: 'var(--color-text-strong)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          dark: '#18181b',
        },
        success: '#4EDEA3',
        error: '#f87171',
        warning: '#fbbf24',
        info: '#60a5fa',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-in': 'slideIn 300ms ease-out',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideIn: {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 153, 0, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(255, 153, 0, 0.5)' },
        },
      },
    },
  },
  plugins: [typography],
};
