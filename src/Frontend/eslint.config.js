import js from "@eslint/js"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"
import jsdoc from "eslint-plugin-jsdoc"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"

export default defineConfig(
  globalIgnores(["dist"]),
  {
    extends: [js.configs.recommended, tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    extends: [jsdoc.configs["flat/recommended-typescript-error"]],
    files: ["**/*.{ts,tsx}"],
    ignores: ["src/generated/**"],
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          enableFixer: false,
          require: { FunctionDeclaration: true },
          contexts: [
            "VariableDeclarator > ArrowFunctionExpression",
            "VariableDeclarator > FunctionExpression",
          ],
        },
      ],
      "jsdoc/require-param": ["error", { unnamedRootBase: ["props"] }],
      "jsdoc/require-description": "error",
      "jsdoc/require-hyphen-before-param-description": ["error", "always"],
      "jsdoc/tag-lines": ["error", "never", { startLines: 1 }],
      "jsdoc/convert-to-jsdoc-comments": "error",
      "jsdoc/no-bad-blocks": "error",
    },
  },
)
