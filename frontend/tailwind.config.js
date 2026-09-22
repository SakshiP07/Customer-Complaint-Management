/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eff6ff",
          600: "#1d4ed8",
          700: "#1e40af",
          900: "#0f172a",
        },
      },
    },
  },
  plugins: [],
};
