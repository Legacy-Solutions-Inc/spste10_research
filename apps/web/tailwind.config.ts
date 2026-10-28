import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
      },
      // Type scale: xs 12 / 13 / sm 14 / base 16 / xl 20 / 28
      fontSize: {
        "13": ["0.8125rem", { lineHeight: "1.125rem" }],
        "28": ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.02em" }],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          muted: "hsl(var(--sidebar-muted))",
          accent: "hsl(var(--sidebar-accent))",
        },
        // Incident signal colors. Only incidents use these; chrome stays navy and neutral.
        alert: {
          DEFAULT: "hsl(var(--alert))",
          soft: "hsl(var(--alert-soft))",
        },
        report: {
          DEFAULT: "hsl(var(--report))",
          soft: "hsl(var(--report-soft))",
        },
        resolved: {
          DEFAULT: "hsl(var(--resolved))",
          soft: "hsl(var(--resolved-soft))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        panel: "0 1px 2px hsl(222 47% 11% / 0.06), 0 8px 24px -6px hsl(222 47% 11% / 0.14)",
      },
      keyframes: {
        "row-arrive": {
          from: { backgroundColor: "hsl(var(--alert-soft))" },
          to: { backgroundColor: "transparent" },
        },
      },
      animation: {
        "row-arrive": "row-arrive 2.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
