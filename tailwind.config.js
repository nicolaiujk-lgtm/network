/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0F172A",
        primary: "#6366F1",
        secondary: "#3B82F6",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444"
      },
      boxShadow: {
        card: "0 18px 45px rgba(15, 23, 42, 0.10)",
        lift: "0 24px 65px rgba(15, 23, 42, 0.16)"
      }
    }
  },
  plugins: []
};
