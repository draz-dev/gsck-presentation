/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./*.html",
    "./*.js",
    "./shared/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        presentation: {
          bg: '#0a0a0c',
          panel: 'rgba(18, 18, 24, 0.55)',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: '#6366f1'
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
