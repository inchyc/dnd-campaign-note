/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["Cinzel", "Palatino Linotype", "Book Antiqua", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Cascadia Code", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        md: {
          primary: {
            DEFAULT: '#6750A4',
            container: '#EADDFF',
            on: '#FFFFFF',
            onContainer: '#21005D',
          },
          secondary: {
            DEFAULT: '#625B71',
            container: '#E8DEF8',
            on: '#FFFFFF',
            onContainer: '#1D192B',
          },
          tertiary: {
            DEFAULT: '#7D5260',
            container: '#FFD8E4',
            on: '#FFFFFF',
            onContainer: '#31111D',
          },
          surface: {
            DEFAULT: '#FEF7FF',
            variant: '#E7E0EC',
            on: '#1C1B1F',
            onVariant: '#49454F',
          },
          error: {
            DEFAULT: '#B3261E',
            on: '#FFFFFF',
          },
        },
        fantasy: {
          900: "#0f0f13",
          850: "#14141b",
          800: "#1a1a24",
          700: "#262635",
          600: "#37374b",
          gold: "#d4af37",
          crimson: "#8b0000",
          amber: "#f59e0b",
        }
      }
    },
  },
  plugins: [],
};
