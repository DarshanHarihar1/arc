/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Calm-palette semantic tokens (arc design system).
        ink: { DEFAULT: "#1E2630", soft: "#5C6775", faint: "#9AA3AF", mute: "#8A93A0" },
        canvas: "#F4F6F8",
        line: { DEFAULT: "#E8ECEF", soft: "#F1F3F5" },
        tint: "#EAF6EF",
        green: { deep: "#1C7A50" },
        surface: { DEFAULT: "#FFFFFF", soft: "#F0F2F4" },
        danger: "#C0564B",
      },
      fontFamily: {
        sans: ['"Geist"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.04)",
        cta: "0 1px 2px rgba(20,80,50,.2)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
