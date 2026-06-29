import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          icons: ["lucide"]
        }
      }
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5188
  },
  preview: {
    host: "0.0.0.0",
    port: 5188
  }
});
