/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Noto Serif KR'", "Georgia", "serif"],
        sans:  ["'Pretendard'", "system-ui", "sans-serif"],
        mono:  ["'Courier Prime'", "Courier New", "monospace"], // 타자기용
      },
      colors: {
        paper:  { 50:"#FAFAF5", 100:"#F4F1E8", 200:"#E8E2D0", 800:"#8C8070" },
        ink:    { 800:"#4A4540", 900:"#2A2520" },
        mist:   { 200:"#C0C8B8" },
        moss:   { 200:"#9AAD90" },
        seal:   { DEFAULT:"#C47060", light:"#D49080" },
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease forwards",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
      },
    },
  },
  plugins: [],
};