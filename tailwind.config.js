/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./assets/js/site.js", "./scripts/build-legal.mjs"],
  theme: {
    extend: {
      colors: {
        "gl-base": "#0a0e14",
        "gl-card": "#141b24",
        "gl-accent": "#dfb135",
        "gl-muted": "#8b949e",
        wa: "#25D366",
        "wa-hover": "#3ee07d",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["Montserrat", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
