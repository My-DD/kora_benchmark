import js from "@eslint/js";
import drizzle from "eslint-plugin-drizzle";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import {defineConfig, globalIgnores} from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: {js, drizzle, react},
    extends: ["js/recommended"],
    languageOptions: {globals: {...globals.browser, ...globals.node}},
    settings: {
      react: {
        version: "19",
      },
    },
  },
  tseslint.configs.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat.recommended,
  globalIgnores([
    "**/dist/**",
    "**/build/**",
    "**/node_modules/**",
    "**/.wrangler/**",
    "**/worker-configuration.d.ts",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-expressions": [
        "warn",
        {allowTaggedTemplates: true},
      ],
      "react-hooks/exhaustive-deps": [
        "warn",
        {additionalHooks: "(useAbortable)"},
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {argsIgnorePattern: "^_"}],
      "drizzle/enforce-delete-with-where": ["error", {drizzleObjectName: "db"}],
      "drizzle/enforce-update-with-where": ["error", {drizzleObjectName: "db"}],
    },
  },
]);
