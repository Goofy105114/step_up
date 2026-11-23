/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4f0', 100: '#fbe5d8', 200: '#f7c8ae',
          300: '#f1a07a', 400: '#ea7044', 500: '#e34f20',
          600: '#d43a15', 700: '#b02c13', 800: '#8d2516',
          900: '#732216',
        },
      },
      fontFamily: {
        sans: ['"Open Sans"', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' },                              '100%': { opacity: '1' } },
        slideUp:   { '0%': { transform: 'translateY(16px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideRight:{ '0%': { transform: 'translateX(-16px)', opacity: '0'}, '100%': { transform: 'translateX(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
