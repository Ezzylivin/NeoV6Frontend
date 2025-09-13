/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <-- ADD THIS LINE
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        blue: {
          500: '#3b82f6',
          600: '#2563eb',
        },
      },
    },
  },
  plugins: [],
}
