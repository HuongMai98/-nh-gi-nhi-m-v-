// Build bản web 1 file: npm run build:web → ../build-review/index.html
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// ponytail: tự gộp JS/CSS vào HTML thay vì thêm vite-plugin-singlefile.
const inlineAll = (): Plugin => ({
  name: "inline-all",
  enforce: "post",
  generateBundle: {
    order: "post",
    handler(_, bundle) {
    const html = Object.values(bundle).find((f) => f.fileName.endsWith(".html"));
    if (!html || html.type !== "asset") return;
    let source = String(html.source);
    for (const [name, file] of Object.entries(bundle)) {
      if (file.type === "chunk" && file.isEntry) {
        source = source.replace(new RegExp(`<script[^>]*src="[^"]*${name}"[^>]*></script>`), () => `<script type="module">${file.code}</script>`);
        delete bundle[name];
      } else if (file.type === "asset" && name.endsWith(".css")) {
        // Link CSS có thể chưa được chèn vào HTML ở bước này, nên tự chèn <style> vào <head>.
        const css = String(file.source);
        source = source.replace(new RegExp(`<link[^>]*href="[^"]*${name}"[^>]*>`), "").replace("</head>", () => `<style>${css}</style>\n</head>`);
        delete bundle[name];
      }
    }
    html.source = source;
    },
  },
});

export default defineConfig({
  root: __dirname,
  base: "./",
  plugins: [react(), tailwindcss(), inlineAll()],
  resolve: { alias: { "@": path.resolve(__dirname, "../src") } },
  build: {
    outDir: path.resolve(__dirname, "../../build-review"),
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    rolldownOptions: { output: { codeSplitting: false } },
  },
});
