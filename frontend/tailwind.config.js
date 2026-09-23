/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Inter Tight", "Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "monospace"],
        serif: ["Newsreader", "Georgia", "serif"],
      },
      colors: {
        dark: {
          bg: "#050507",
          surface: "#0D0D12",
          surface2: "#14141C",
          surface3: "#1C1C26",
          border: "rgba(255, 255, 255, 0.08)",
          borderHover: "rgba(255, 255, 255, 0.16)",
          borderActive: "rgba(99, 102, 241, 0.4)",
        },
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
      },
      boxShadow: {
        "glow-sm": "0 0 16px -4px rgba(99, 102, 241, 0.25)",
        "glow-md": "0 0 32px -8px rgba(99, 102, 241, 0.35)",
        "glow-lg": "0 0 48px -12px rgba(99, 102, 241, 0.45)",
        "tactile": "inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 2px 8px rgba(0, 0, 0, 0.4)",
        "pill": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      animation: {
        "shimmer": "shimmer 2.5s infinite linear",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};
