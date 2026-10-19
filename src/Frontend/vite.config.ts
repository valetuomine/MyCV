import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Libraries that change together share a chunk, so each stays under the
// size warning and stays cached until that library is upgraded.
// MSAL is the largest chunk and every visitor downloads it, because
// MsalProvider wraps the whole app in main.tsx. If the first load has to
// shrink further, load MSAL only on the admin and sign-in routes.
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
    // RTK Query depends on it, so it must not drag the forms chunk along.
    "@standard-schema/utils",
  ],
  forms: ["react-hook-form", "@hookform/resolvers", "zod"],
}

const packageChunk = new Map(
  Object.entries(vendorChunks).flatMap(([chunk, packages]) =>
    packages.map((packageName) => [packageName, `vendor-${chunk}`]),
  ),
)

function manualChunks(id: string): string | undefined {
  const match = id
    .replace(/\\/g, "/")
    .match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)\//)
  return match ? packageChunk.get(match[1]) : undefined
}

// https://vite.dev/config/
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
