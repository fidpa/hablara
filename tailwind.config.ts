// Tailwind CSS Configuration
// Guidelines: docs/reference/guidelines/CONFIG.md#tailwindconfigts

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ==========================================
           shadcn/ui Semantic Colors (HSL)
           ========================================== */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
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

        /* ==========================================
           Hablará Custom Colors (Hex via CSS Variables)
           ========================================== */
        // Surface colors
        surface: {
          DEFAULT: "var(--color-surface)",
          hover: "var(--color-surface-hover)",
        },
        // Emotion colors
        emotion: {
          neutral: "var(--color-emotion-neutral)",
          calm: "var(--color-emotion-calm)",
          stress: "var(--color-emotion-stress)",
          excitement: "var(--color-emotion-excitement)",
          uncertainty: "var(--color-emotion-uncertainty)",
          frustration: "var(--color-emotion-frustration)",
          joy: "var(--color-emotion-joy)",
          doubt: "var(--color-emotion-doubt)",
          conviction: "var(--color-emotion-conviction)",
          aggression: "var(--color-emotion-aggression)",
        },
        // Fallacy highlight colors
        fallacy: {
          "ad-hominem": "var(--color-fallacy-ad-hominem)",
          "straw-man": "var(--color-fallacy-straw-man)",
          "false-dichotomy": "var(--color-fallacy-false-dichotomy)",
          "appeal-authority": "var(--color-fallacy-appeal-authority)",
          "circular": "var(--color-fallacy-circular)",
          "slippery-slope": "var(--color-fallacy-slippery-slope)",
          "red-herring": "var(--color-fallacy-red-herring)",
          "tu-quoque": "var(--color-fallacy-tu-quoque)",
          "hasty-generalization": "var(--color-fallacy-hasty-generalization)",
          "post-hoc": "var(--color-fallacy-post-hoc)",
          "bandwagon": "var(--color-fallacy-bandwagon)",
          "appeal-emotion": "var(--color-fallacy-appeal-emotion)",
          "appeal-ignorance": "var(--color-fallacy-appeal-ignorance)",
          "loaded-question": "var(--color-fallacy-loaded-question)",
          "no-true-scotsman": "var(--color-fallacy-no-true-scotsman)",
          "false-cause": "var(--color-fallacy-false-cause)",
        },
        // Topic colors
        topic: {
          "work-career": "var(--color-topic-work-career)",
          "health-wellbeing": "var(--color-topic-health-wellbeing)",
          "relationships-social": "var(--color-topic-relationships-social)",
          "finances": "var(--color-topic-finances)",
          "personal-development": "var(--color-topic-personal-development)",
          "creativity-hobbies": "var(--color-topic-creativity-hobbies)",
          "other": "var(--color-topic-other)",
        },
        // Tone dimension colors
        tone: {
          "formality": "var(--color-tone-formality)",
          "professionalism": "var(--color-tone-professionalism)",
          "directness": "var(--color-tone-directness)",
          "energy": "var(--color-tone-energy)",
          "seriousness": "var(--color-tone-seriousness)",
        },
        // Audio level colors
        level: {
          "normal": "var(--color-level-normal)",
          "warning": "var(--color-level-warning)",
          "danger": "var(--color-level-danger)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "waveform": "waveform 1s ease-in-out infinite",
        // P2-3: 300ms matches PROCESSING_UI_TIMINGS.hotkeyFlashDurationMs (CSS cannot reference JS constants)
        "hotkey-flash": "hotkey-flash 300ms ease-out",
      },
      keyframes: {
        waveform: {
          "0%, 100%": { transform: "scaleY(0.5)" },
          "50%": { transform: "scaleY(1)" },
        },
        "hotkey-flash": {
          "0%": {
            transform: "scale(1)",
            boxShadow: "0 0 0 0 rgba(59, 130, 246, 0.7)",
          },
          "50%": {
            transform: "scale(1.1)",
            boxShadow: "0 0 0 12px rgba(59, 130, 246, 0)",
          },
          "100%": {
            transform: "scale(1)",
            boxShadow: "0 0 0 0 rgba(59, 130, 246, 0)",
          },
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
};

export default config;
