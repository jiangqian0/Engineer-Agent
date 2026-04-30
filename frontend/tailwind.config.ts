import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#00693C",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#002D62",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#C84C3E",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        manulife: {
          red: "#C84C3E",
          redHover: "#A33C30",
          redActive: "#823027",
          green: "#00693C",
          greenLight: "#009E5F",
          blue: "#002D62",
          grey: "#666666",
          lightGrey: "#E8E8E8",
          lightGreyBg: "#F5F5F5",
        },
        alert: {
          info: { bg: "#EFF6FF", border: "#3B82F6", text: "#1E40AF" },
          success: { bg: "#ECFDF3", border: "#00693C", text: "#00693C" },
          warning: { bg: "#FFF7ED", border: "#F59E0B", text: "#B45309" },
          error: { bg: "#FEF2F2", border: "#C84C3E", text: "#C84C3E" },
        },
      },
      borderRadius: {
        lg: "0",
        md: "0",
        sm: "0",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
