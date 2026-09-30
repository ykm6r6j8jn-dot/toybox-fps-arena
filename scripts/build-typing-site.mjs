import { cp, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { build } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "dist-typing");

await build({
  configFile: false,
  root,
  base: "./",
  build: {
    outDir: output,
    emptyOutDir: true,
    copyPublicDir: false,
    rollupOptions: { input: resolve(root, "typing.html") },
  },
});
await cp(resolve(root, "public/typing"), resolve(output, "typing"), {
  recursive: true,
});
await copyFile(resolve(output, "typing.html"), resolve(output, "index.html"));
console.log("MOCHI TYPE static release is ready in dist-typing/.");
