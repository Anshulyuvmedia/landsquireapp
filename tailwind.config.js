/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        rubik: ["Rubik-Regular", "sans-serif"],
        "rubik-bold": ["Rubik-Bold", "sans-serif"],
        "rubik-extrabold": ["Rubik-ExtraBold", "sans-serif"],
        "rubik-medium": ["Rubik-Medium", "sans-serif"],
        "rubik-semibold": ["Rubik-SemiBold", "sans-serif"],
        "rubik-light": ["Rubik-Light", "sans-serif"],
        "noto-serif-devanagari-bold": ["NotoSerifDevanagari-Bold", "serif"],
        "noto-serif-devanagari-extrabold": ["NotoSerifDevanagari-ExtraBold", "serif"],
        "noto-serif-devanagari-light": ["NotoSerifDevanagari-Light", "serif"],
        "noto-serif-devanagari-medium": ["NotoSerifDevanagari-Medium", "serif"],
        "noto-serif-devanagari-regular": ["NotoSerifDevanagari-Regular", "serif"],
        "noto-serif-devanagari-semibold": ["NotoSerifDevanagari-SemiBold", "serif"],
      },
      colors: {
        primary: {
          100: "#f4f2f7", // light gray
          200: "#234F681A", // transparent teal
          300: "#234F68", // dark teal
          400: "#8bc83f", // green
        },
        accent: {
          100: "#FBFBFD",
        },
        black: {
          DEFAULT: "#000000",
          100: "#8C8E98",
          200: "#666876",
          300: "#191D31",
        },
        danger: "#F75555",
      },
    },
  },
  plugins: [],
}