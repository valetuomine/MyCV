import js from "@eslint/js"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"
import jsdoc from "eslint-plugin-jsdoc"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import sonarjs from "eslint-plugin-sonarjs"
import tseslint from "typescript-eslint"
import unicorn from "eslint-plugin-unicorn"

export default defineConfig(
  globalIgnores(["dist"]),
  {
    extends: [js.configs.recommended, tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-deprecated": "error",
      "no-await-in-loop": "error",
      "@typescript-eslint/no-base-to-string": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            "Render text through JSX, which escapes it. Raw HTML can run injected markup.",
        },
        {
          selector:
            "AssignmentExpression > MemberExpression.left[property.name=/^(innerHTML|outerHTML)$/]",
          message:
            "Set textContent or render through JSX. Assigned HTML can run injected markup.",
        },
        {
          selector:
            "AssignmentExpression > MemberExpression.left[computed=true][property.value=/^(innerHTML|outerHTML)$/]",
          message:
            "Set textContent or render through JSX. Assigned HTML can run injected markup.",
        },
        {
          selector:
            "CallExpression[callee.property.name='insertAdjacentHTML'], CallExpression[callee.object.name='document'][callee.property.name=/^(write|writeln)$/]",
          message:
            "Build elements through JSX or the DOM API. insertAdjacentHTML and document.write can run injected markup.",
        },
        {
          selector: "JSXAttribute[name.name='role'] Literal[value='status']",
          message:
            'Use the <output> element instead of role="status" (jsx-a11y/prefer-tag-over-role, Sonar S6819).',
        },
        {
          selector: "JSXAttribute[name.name='role'] Literal[value='group']",
          message:
            'Use the <fieldset> element instead of role="group" (jsx-a11y/prefer-tag-over-role, Sonar S6819).',
        },
      ],
    },
  },
  {
    extends: [sonarjs.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    ignores: ["src/generated/**"],
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
  {
    files: ["e2e/**/*.ts"],
    plugins: { unicorn },
    rules: { "unicorn/prefer-top-level-await": "error" },
  },
  {
    files: ["src/generated/**", "e2e/**"],
    rules: { "@typescript-eslint/no-deprecated": "off" },
  },
)
