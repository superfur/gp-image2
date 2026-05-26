/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'app-bg': '#F3F6FB',
        'surface': '#FFFFFF',
        'surface-alt': '#F8FBFF',
        'border': '#DCE6F4',
        'text-primary': '#0F172A',
        'text-secondary': '#64748B',
        'accent': '#2563EB',
        'accent-hover': '#1D4ED8',
        'header-bg': '#0F172A',
        'header-card': '#111C33',
        'success': '#16A34A',
        'error': '#DC2626',
        'tab-bg': '#111C33',
        'tab-selected': '#2563EB',
        'tab-hover': '#1B2947',
      },
      fontFamily: {
        sans: ['"Microsoft YaHei"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '20px',
        'card-sm': '16px',
        'card-xs': '14px',
        'input': '10px',
        'btn': '10px',
      },
    },
  },
  plugins: [],
}
