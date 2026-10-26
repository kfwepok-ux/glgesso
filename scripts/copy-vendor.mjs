// Copia para assets/ só o que o site usa: os pesos de fonte (subconjunto latin)
// e a biblioteca web-vitals, para não depender de CDNs externas.
import { copyFileSync, mkdirSync } from "node:fs";

const files = [
  ["@fontsource/inter/files/inter-latin-400-normal.woff2", "assets/fonts/inter-400.woff2"],
  ["@fontsource/inter/files/inter-latin-500-normal.woff2", "assets/fonts/inter-500.woff2"],
  ["@fontsource/inter/files/inter-latin-600-normal.woff2", "assets/fonts/inter-600.woff2"],
  ["@fontsource/montserrat/files/montserrat-latin-700-normal.woff2", "assets/fonts/montserrat-700.woff2"],
  ["@fontsource/montserrat/files/montserrat-latin-800-normal.woff2", "assets/fonts/montserrat-800.woff2"],
  ["web-vitals/dist/web-vitals.iife.js", "assets/js/web-vitals.js"],
];

mkdirSync("assets/fonts", { recursive: true });
mkdirSync("assets/js", { recursive: true });
for (const [from, to] of files) {
  copyFileSync(`node_modules/${from}`, to);
  console.log(to);
}
