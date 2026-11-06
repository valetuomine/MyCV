---
paths:
  - "src/Frontend/**/*.{ts,tsx}"
---

# Frontend JSDoc

Frontend code is documented with JSDoc only. The full rules, with an example, are in `.claude/skills/setup-frontend/references/jsdoc.md`: read it before writing or changing frontend code.

- No `//` or `/* */` comments, JSX `{/* */}` comments or commented-out code; delete dead code instead. Exceptions: tool directives such as `/// <reference types="..." />` and generated files such as `src/generated/openapi.ts`.
- Every function has a JSDoc summary: components, hooks, helpers, and handlers or callbacks declared inside them. Every `const` or `let` whose value has logic (a conditional, a computation, a regex, a function value, a hook with a callback, a schema with rules) has one too.
- Write the summary in English, starting with what the code does and then why when it is not obvious. Document each parameter with `@param name - description` (destructured props as `@param props.<name>`) and the returned value with `@returns`, without types.
- `eslint-plugin-jsdoc` enforces the function rules in `npm --prefix src/Frontend run lint`; whether a non-function `const` has logic is left to review.
