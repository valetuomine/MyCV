import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Vendor packages grouped by the chunk they are bundled into. Libraries that
 * change together share a chunk, so each stays under the size warning and
 * stays cached until that library is upgraded.
 *
 * MSAL is the largest chunk and every visitor downloads it, because
 * MsalProvider wraps the whole app in main.tsx. If the first load has to
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
 * Vite configuration. The dev server proxies `/api` to the local backend.
 *
 * @see https://vite.dev/config/
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
      "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src"),
    },
  },
})
