import js from "@eslint/js"
import globals from "globals"
import sonarjs from "eslint-plugin-sonarjs"
import unicorn from "eslint-plugin-unicorn"
import { defineConfig } from "eslint/config"

/**
 * ESLint config for the Node scripts in `.claude/hooks/`. It reuses the Sonar rules of the frontend, such as
 * S3776 (cognitive complexity), so that the hooks fail `npm run lint:hooks` for the same findings as the frontend.
 * The config lives here because the Sonar plugin is installed in this package.
 */
export default defineConfig({
  extends: [js.configs.recommended, sonarjs.configs.recommended],
  files: ["**/*.mjs"],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    globals: globals.node,
  },
  plugins: { unicorn },
  rules: {
    "no-unused-expressions": "error",
    "sonarjs/prefer-regexp-exec": "error",
    "unicorn/prefer-string-replace-all": "error",
  },
})
