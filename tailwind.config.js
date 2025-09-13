/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // Scans all your component files for classes
  ],
  theme: {
    extend: {
      // Here we define your app's color palette
      colors: {
        // Example: You can now use classes like `bg-gray-900` or `text-blue-500`
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
