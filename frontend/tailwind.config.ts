import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#FAF5FF",
          100: "#F3E8FF",
          200: "#E9D5FF",
          250: "#D6C2F9",
          300: "#D8B4FE",
          400: "#C084FC",
          500: "#A855F7", // Purple Accent
          600: "#9333EA",
          650: "#7C2DDB",
          700: "#7E22CE",
          800: "#6B21A8",
          900: "#581C87",
        },
        slate: {
          55: "#F8FAFC",
          150: "#EBEFF5",
          250: "#D8E2ED",
          350: "#C2D1E0",
          450: "#7A8B9E",
          550: "#536274",
          650: "#3B4856",
          750: "#26313D",
          850: "#161F28",
        },
        red: {
          650: "#E11D48",
          750: "#BE123C",
        },
        emerald: {
          355: "#34D399",
          550: "#10B981",
          650: "#059669",
        },
        amber: {
          250: "#FBBF24",
        },
        blue: {
          550: "#3B82F6",
        },
        status: {
          available: {
            bg: "#ECFDF5",
            text: "#065F46",
            border: "#6EE7B7",
          },
          allocated: {
            bg: "#EFF6FF",
            text: "#1E40AF",
            border: "#93C5FD",
          },
          reserved: {
            bg: "#FFFBEB",
            text: "#92400E",
            border: "#FCD34D",
          },
          maintenance: {
            bg: "#FFF7ED",
            text: "#9A3412",
            border: "#FDBA74",
          },
          lost: {
            bg: "#FEF2F2",
            text: "#991B1B",
            border: "#FCA5A5",
          },
          retired: {
            bg: "#F9FAFB",
            text: "#374151",
            border: "#D1D5DB",
          },
          disposed: {
            bg: "#F9FAFB",
            text: "#6B7280",
            border: "#E5E7EB",
          },
        },
        priority: {
          low: { bg: "#F9FAFB", text: "#6B7280", border: "#9CA3AF" },
          medium: { bg: "#EFF6FF", text: "#1E40AF", border: "#3B82F6" },
          high: { bg: "#FFF7ED", text: "#9A3412", border: "#F97316" },
          critical: { bg: "#FEF2F2", text: "#991B1B", border: "#EF4444" },
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 3px rgba(168, 85, 247, 0.25)",
        errorGlow: "0 0 0 3px rgba(239, 68, 68, 0.25)",
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      },
      animation: {
        shimmer: "shimmer 1.5s infinite linear",
        wiggle: "wiggle 0.5s ease-in-out 2",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-12deg)" },
          "75%": { transform: "rotate(12deg)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
