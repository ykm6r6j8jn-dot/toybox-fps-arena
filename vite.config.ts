import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    {
      name: "mochi-type-home",
      configureServer(server) {
        // The dedicated typing command opens the game at its root URL.
        // The existing multiplayer development server keeps its FPS homepage.
        if (server.config.server.port !== 5190) return;
        server.middlewares.use((req, _res, next) => {
          if (req.url === "/" || req.url?.startsWith("/?")) {
            req.url = req.url.replace(/^\//, "/typing.html");
          }
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        index: resolve(process.cwd(), "index.html"),
        typing: resolve(process.cwd(), "typing.html"),
      },
      output: {
        manualChunks: {
          three: ["three"],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5188,
  },
  preview: {
    host: "0.0.0.0",
    port: 5188,
  },
});
