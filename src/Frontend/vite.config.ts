import { defineConfig, loadEnv, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/** The frontend's root folder, where this file lives. */
const rootDir = path.dirname(fileURLToPath(import.meta.url))

/** The Static Web Apps configuration, whose name is the same in `public` and `dist`. */
const swaConfigFile = "staticwebapp.config.json"

/**
 * The Content Security Policy directives that must also allow the API's own
 * origin: requests, the profile picture, and the PDF, which the PDF page shows
 * in an `<object>`.
 */
const apiOriginDirectives = [
  "connect-src",
  "img-src",
  "frame-src",
  "object-src",
]

/**
 * Reads the API's origin from `VITE_API_BASE_URL`, which is empty when the
 * API shares the app's origin. Any other value must be an `http` or `https`
 * address: without a scheme, such as `localhost:5062`, the URL parser would
 * read `localhost:` as the scheme and the origin as `null`.
 *
 * @param apiBaseUrl - The value of `VITE_API_BASE_URL`.
 * @returns The API's origin, or undefined when it shares the app's origin.
 */
function readApiOrigin(apiBaseUrl: string | undefined): string | undefined {
  const value = apiBaseUrl?.trim()
  if (!value) {
    return undefined
  }

  const url = URL.canParse(value) ? new URL(value) : null
  if (url?.protocol !== "http:" && url?.protocol !== "https:") {
    throw new Error(
      `VITE_API_BASE_URL must be an http or https address, or empty, got "${value}".`,
    )
  }

  return url.origin
}

/**
 * Adds a source to the given directives of a Content Security Policy,
 * skipping a directive that already lists it.
 *
 * @param policy - The policy, with directives separated by semicolons.
 * @param directives - The directives to add the source to.
 * @param source - The source, such as `https://api.example.com`.
 * @returns The policy with the source added.
 */
function addCspSource(
  policy: string,
  directives: string[],
  source: string,
): string {
  return policy
    .split(";")
    .map((directive) => {
      const [name, ...sources] = directive.trim().split(/\s+/)
      return directives.includes(name) && !sources.includes(source)
        ? [name, ...sources, source].join(" ")
        : directive.trim()
    })
    .join("; ")
}

/**
 * Reads the Static Web Apps configuration and adds the API's origin to its
 * Content Security Policy, so a production address is never written into the
 * repository.
 *
 * @param configPath - The path of the `staticwebapp.config.json` to read.
 * @param apiOrigin - The API's origin, or undefined when it shares the app's.
 * @returns The configuration, with the API's origin in its policy.
 */
function readSwaConfig(
  configPath: string,
  apiOrigin: string | undefined,
): { globalHeaders: Record<string, string> } {
  const config = JSON.parse(readFileSync(configPath, "utf8")) as {
    globalHeaders: Record<string, string>
  }
  const policy = config.globalHeaders["Content-Security-Policy"]
  if (apiOrigin && policy) {
    config.globalHeaders["Content-Security-Policy"] = addCspSource(
      policy,
      apiOriginDirectives,
      apiOrigin,
    )
  }

  return config
}

/**
 * Adds the API's origin to the Content Security Policy in the built
 * `staticwebapp.config.json`, once Vite has copied it from `public`.
 *
 * @param apiOrigin - The API's origin, or undefined when it shares the app's.
 * @returns The Vite plugin, which runs only in builds.
 */
function swaCspApiOrigin(apiOrigin: string | undefined): Plugin {
  return {
    name: "mycv-swa-csp-api-origin",
    apply: "build",
    /**
     * Rewrites the copied configuration with the API's origin.
     *
     * @param options - Rollup's output options, whose `dir` is the build folder.
     */
    writeBundle(options) {
      if (!apiOrigin || !options.dir) {
        return
      }

      const configPath = path.join(options.dir, swaConfigFile)
      writeFileSync(
        configPath,
        `${JSON.stringify(readSwaConfig(configPath, apiOrigin), null, 2)}\n`,
      )
    },
  }
}

/**
 * Vendor packages grouped by the chunk they are bundled into. Libraries that
 * change together share a chunk, so each stays under the size warning and
 * stays cached until that library is upgraded.
 *
 * MSAL is the largest chunk and every visitor downloads it, because
 * MsalProvider wraps the whole app in startApp.tsx. If the first load has to
 * shrink further, load MSAL only on the admin and sign-in routes.
 *
 * `@standard-schema/utils` sits in the redux chunk because RTK Query depends
 * on it, so it must not drag the forms chunk along.
 */
const vendorChunks: Record<string, string[]> = {
  react: ["react", "react-dom", "scheduler"],
  router: ["react-router", "react-router-dom", "cookie", "set-cookie-parser"],
  msal: ["@azure/msal-browser", "@azure/msal-common", "@azure/msal-react"],
  motion: ["framer-motion", "motion-dom", "motion-utils"],
  redux: [
    "@reduxjs/toolkit",
    "redux",
    "redux-thunk",
    "react-redux",
    "immer",
    "reselect",
    "@standard-schema/utils",
  ],
  forms: ["react-hook-form", "@hookform/resolvers", "zod"],
}

/** Looks up the `vendor-*` chunk name for each package in `vendorChunks`. */
const packageChunk = new Map(
  Object.entries(vendorChunks).flatMap(([chunk, packages]) =>
    packages.map((packageName) => [packageName, `vendor-${chunk}`]),
  ),
)

/**
 * Rollup's chunk picker. Reads the package name from a module's
 * `node_modules` path and returns its vendor chunk, or undefined to let
 * Rollup decide for application code and unlisted packages.
 *
 * @param id - The module's file path.
 * @returns The `vendor-*` chunk name, or undefined.
 */
function manualChunks(id: string): string | undefined {
  const match = id
    .replace(/\\/g, "/")
    .match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)\//)
  return match ? packageChunk.get(match[1]) : undefined
}

/**
 * Vite configuration. The dev server proxies `/api` to the local backend,
 * and `vite preview` does too, through the same proxy settings.
 * MSAL's redirect bridge is pre-bundled, because only sign-in popups import
 * it, and finding it on the first popup made the dev server re-optimise its
 * dependencies and reload the tab in the middle of the sign-in.
 *
 * The security headers, the Content Security Policy among them, come from
 * `public/staticwebapp.config.json`. Builds add the API's origin to the copy
 * in `dist`, and `vite preview` sends the same headers, so the policy is
 * tested on the production build. The dev server sends none, because it
 * needs inline scripts.
 *
 * @see https://vite.dev/config/
 */
export default defineConfig(({ mode }) => {
  /** The API's origin from `VITE_API_BASE_URL`, or undefined when it shares the app's. */
  const apiOrigin = readApiOrigin(
    loadEnv(mode, rootDir, "VITE_").VITE_API_BASE_URL,
  )

  return {
    plugins: [react(), tailwindcss(), swaCspApiOrigin(apiOrigin)],
    optimizeDeps: {
      include: ["@azure/msal-browser/redirect-bridge"],
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        "/api": {
          target: "http://localhost:5062",
          changeOrigin: true,
        },
      },
    },
    preview: {
      headers: readSwaConfig(
        path.join(rootDir, "public", swaConfigFile),
        apiOrigin,
      ).globalHeaders,
    },
    build: {
      rollupOptions: {
        output: { manualChunks },
        /**
         * Drops the `INVALID_ANNOTATION` warnings Rollup raises for zod's
         * published code and passes every other warning on.
         *
         * @param warning - The warning Rollup raised.
         * @param warn - Rollup's default handler, which prints the warning.
         */
        onwarn(warning, warn) {
          const moduleId = warning.id?.replace(/\\/g, "/")
          if (
            warning.code === "INVALID_ANNOTATION" &&
            moduleId?.includes("node_modules/zod/")
          ) {
            return
          }

          warn(warning)
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "src"),
      },
    },
  }
})
