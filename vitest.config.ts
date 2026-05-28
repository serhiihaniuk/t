import { fileURLToPath } from "node:url"

import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    css: true,
    environment: "jsdom",
    include: ["modules/**/*.test.{ts,tsx}"],
    setupFiles: ["./test/setup.ts"],
  },
})
