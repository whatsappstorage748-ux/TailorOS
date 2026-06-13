/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc2fc',
          400: '#38a0f9',
          500: '#0e82eb',
          600: '#0265c9',
          700: '#0351a2',
          800: '#074585',
          900: '#0c3b6f',
        }
      }
    },
  },
  plugins: [],
}
