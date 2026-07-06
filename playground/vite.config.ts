import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Pyodide runtime is loaded from a CDN inside the worker (see src/worker/pyodide.worker.ts);
// only the weft wheel + examples are served from public/ as same-origin static assets.
export default defineConfig({
  plugins: [react()],
  base: "./",
  worker: {
    format: "es",
  },
  server: {
    port: 5173,
  },
});
