/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          700: '#3c4a63',
          800: '#242f45',
          850: '#1a2236',
          900: '#111828',
        }
      },
      fontFamily: {
        sans: ['Inter', '"Noto Sans JP"', 'sans-serif'],
        mono: ['Consolas', '"Courier New"', 'monospace'],
      }
    },
  },
  plugins: [],
}