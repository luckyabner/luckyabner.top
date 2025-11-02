import eslint from "@eslint/js";
import eslintPluginAstro from "eslint-plugin-astro";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default [
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,

  // Astro recommended rules
  ...eslintPluginAstro.configs.recommended,

  // JSX accessibility rules
  jsxA11y.flatConfigs.recommended,

  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // Customize your rules here
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow onerror on img elements for fallback handling
      "jsx-a11y/no-noninteractive-element-interactions": [
        "error",
        {
          handlers: [
            "onClick",
            "onMouseDown",
            "onMouseUp",
            "onKeyPress",
            "onKeyDown",
            "onKeyUp",
          ],
        },
      ],
    },
  },

  {
    ignores: [
      "dist/",
      "node_modules/",
      ".astro/",
      ".vercel/",
      "pnpm-lock.yaml",
      "scripts/**",
      "src/content/blog/.obsidian/**",
      "**/*.js", // Ignore all .js files in favor of .ts/.astro
    ],
  },
];
