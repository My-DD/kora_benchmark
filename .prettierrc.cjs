/** @type {import("prettier").Config} */
const config = {
  printWidth: 80,
  bracketSpacing: false,
  arrowParens: "avoid",
  trailingComma: "es5",
  tailwindFunctions: ["tiwi", "tv"],
  tailwindPreserveWhitespace: true,
  plugins: ["prettier-plugin-organize-imports", "prettier-plugin-tailwindcss"],
};

module.exports = config;
