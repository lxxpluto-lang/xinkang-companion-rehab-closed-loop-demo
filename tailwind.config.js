/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        medical: {
          50: "#eef9f7",
          100: "#d8f1ed",
          200: "#b3e2db",
          300: "#80ccc3",
          400: "#4bafa7",
          500: "#2c968f",
          600: "#1f7e79",
          700: "#1d6663",
          800: "#1b5251",
          900: "#123d54"
        }
      },
      boxShadow: {
        card: "0 10px 30px rgba(29, 58, 79, 0.07)",
        float: "0 20px 60px rgba(21, 55, 73, 0.14)"
      }
    }
  },
  plugins: []
};
