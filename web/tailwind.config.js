/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
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
