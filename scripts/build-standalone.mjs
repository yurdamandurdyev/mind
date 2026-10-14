import { build } from "vite";
import react from "@vitejs/plugin-react";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const result = await build({
  root,
  configFile: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "import.meta.env.VITE_STANDALONE": JSON.stringify("true"),
  },
  plugins: [react()],
  build: {
    write: false,
    minify: true,
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL("../src/main.jsx", import.meta.url)),
      name: "MindStandalone",
      formats: ["iife"],
      fileName: "mind",
    },
  },
});
const output = (Array.isArray(result) ? result : [result]).flatMap(
  (bundle) => bundle.output,
);
const scripts = output.filter((entry) => entry.type === "chunk");
const styles = output.filter(
  (entry) => entry.type === "asset" && entry.fileName.endsWith(".css"),
);
if (
  scripts.length !== 1 ||
  scripts[0].imports.length ||
  scripts[0].dynamicImports.length ||
  output.length !== scripts.length + styles.length
) {
  throw new Error(
    "Standalone build must contain one self-contained script and inline CSS only.",
  );
}
const script = scripts[0].code.replace(/<\/script/gi, "<\\/script");
const css = styles
  .map((entry) => String(entry.source))
  .join("\n")
  .replace(/<\/style/gi, "<\\/style");
const icon = (
  await readFile(new URL("../public/icon.svg", import.meta.url))
).toString("base64");
const html = `<!doctype html>
<!-- Generated with npm run build:standalone. Edit src/, not this file. -->
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#101212">
<title>MIND — открыть двойным кликом</title>
<link rel="icon" href="data:image/svg+xml;base64,${icon}">
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<noscript>Включи JavaScript в браузере, чтобы открыть MIND.</noscript>
<script>${script}</script>
</body>
</html>
`;
await writeFile(new URL("../MIND.html", import.meta.url), html);
console.log(
  `MIND.html: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, opens directly with file://`,
);
