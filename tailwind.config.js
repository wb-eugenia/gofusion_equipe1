/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#C97A3C',
        secondary: '#FFD45A',
        success: '#28A745',
        error: '#FF5C5C',
        background: '#FFF7EC',
        surface: '#FFFFFF',
        text: '#2D1B12',
        textMuted: '#8A7465',
        border: '#E4D2C2',
        inactive: '#D8C7B7',
        hover: 'rgba(201, 122, 60, 0.08)',
        focus: 'rgba(201, 122, 60, 0.25)',
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        nunito: ['var(--font-nunito)', 'sans-serif'],
      },
      fontWeight: {
        normal: '400',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      letterSpacing: {
        tight: '-0.01em',
        normal: '0',
        wide: '0.01em',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(45, 27, 18, 0.08)',
        'lift': '0 4px 12px rgba(45, 27, 18, 0.15)',
        'button': '0 4px 0 0 rgba(45, 27, 18, 0.2)',
        'button-hover': '0 2px 0 0 rgba(45, 27, 18, 0.2)',
        'focus': '0 0 0 3px rgba(201, 122, 60, 0.25)',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
      },
    },
  },
  plugins: [],
}

