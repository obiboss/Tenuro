import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/actions/**/*.{ts,tsx}",
    "./src/server/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8F7F4",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#1B4FD8",
          hover: "#153FB0",
          soft: "#EAF0FF",
        },
        gold: {
          DEFAULT: "#F6B73C",
          deep: "#D97706",
          soft: "#FFF4D8",
        },
        success: {
          DEFAULT: "#16A34A",
          soft: "#EAF7EE",
        },
        warning: {
          DEFAULT: "#D97706",
          soft: "#FFF3DF",
        },
        danger: {
          DEFAULT: "#DC2626",
          soft: "#FDECEC",
        },
        text: {
          strong: "#111827",
          normal: "#374151",
          muted: "#6B7280",
        },
        border: {
          soft: "#E7E5DF",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1rem",
        button: "0.75rem",
      },
      boxShadow: {
        card: "0 12px 30px rgba(17, 24, 39, 0.06)",
        soft: "0 8px 20px rgba(17, 24, 39, 0.05)",
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #F6B73C 0%, #D97706 100%)",
        "page-glow":
          "radial-gradient(circle at top left, rgba(246, 183, 60, 0.20), transparent 32rem)",
      },
    },
  },
  plugins: [],
};

export default config;
