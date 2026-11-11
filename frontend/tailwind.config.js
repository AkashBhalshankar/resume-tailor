/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAFAF7',
        ink: '#1F2937',
        accent: { DEFAULT: '#4F46E5', dark: '#4338CA' },
        ok: '#16A34A',
        bad: '#DC2626',
        warn: '#D97706',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { soft: '0 1px 2px rgba(31,41,55,.04), 0 8px 24px -10px rgba(31,41,55,.10)' },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } },
        pop: { '0%': { transform: 'scale(.85)' }, '60%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '100% 0' }, '100%': { backgroundPosition: '0 0' } },
        slideIn: { from: { opacity: 0, transform: 'translateX(24px)' }, to: { opacity: 1, transform: 'none' } },
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
      },
      animation: {
        'fade-up': 'fadeUp .4s cubic-bezier(.2,.7,.2,1) both',
        pop: 'pop .35s ease-out both',
        shimmer: 'shimmer 1.4s ease infinite',
        'slide-in': 'slideIn .3s cubic-bezier(.2,.7,.2,1) both',
        fade: 'fade .2s ease both',
      },
    },
  },
  plugins: [],
};
