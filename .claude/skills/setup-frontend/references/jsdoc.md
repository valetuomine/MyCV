# JSDoc

Part of the `setup-frontend` skill. Read it before documenting frontend code.

- Document code with JSDoc summaries (`/** ... */`) only. Do not write `//` or `/* */` comments, JSX `{/* */}` comments, or commented-out code; delete dead code instead. The only exceptions are tool directives such as `/// <reference types="..." />`, and generated files such as `src/generated/openapi.ts`.
  - Give every function a JSDoc summary: components, hooks, helpers, and event handlers or callbacks declared inside them.
  - Give every `const` (or `let`) a JSDoc summary when its value has logic: a conditional or fallback, a computation, a regex or parser, a function value, a hook with a callback (`useMemo`, `useTransform`, `handleSubmit`), or a schema with rules. Plain literals, destructuring and single comparisons need none, unless the reason for the value isn't obvious.
  - Write the summary in English, starting with what the code does (`Shows`, `Builds`, `Tells whether`) and then why, when the why isn't obvious.
  - Below the summary and one blank line, document every parameter with `@param name - description` and every returned value with `@returns description`. Leave out types, because TypeScript declares them. For destructured component props, document the root as `@param props - The component props.` and each prop as `@param props.<name> - ...`. Functions that return nothing need no `@returns`.

    ```ts
    /**
     * Builds the public path of a candidate's CV.
     *
     * @param publicUrlSegment - The CV's public URL segment.
     * @returns The encoded `/:publicUrlSegment` path.
     */
    ```
  - `eslint-plugin-jsdoc` enforces these rules in `npm run lint` (see `eslint.config.js`): JSDoc on every function declaration and every function assigned to a variable, `@param` and `@returns` tags, `//` comments placed where JSDoc belongs, and the tag format. It can't tell which non-function `const` values have logic, so that part still depends on review.
  - Effects and JSX can't carry JSDoc, so describe what an effect does or why the markup is built that way in the enclosing component's summary. When an inline JSX handler has a branch or more than one statement, move it into a named `const` with its own summary.
