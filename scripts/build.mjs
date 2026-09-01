import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));

if (manifest.version !== packageJson.version) {
  throw new Error("manifest.json and package.json versions must match.");
}
if (manifest.entry !== "./main.js") {
  throw new Error("GitHub-distributed EdgeEver plugins must use ./main.js as entry.");
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await build({
  entryPoints: [resolve(root, "src/main.ts")],
  outfile: resolve(dist, "main.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  legalComments: "eof",
  sourcemap: false,
  logLevel: "info",
});

await Promise.all([
  copyFile(resolve(root, "manifest.json"), resolve(dist, "manifest.json")),
  copyFile(resolve(root, "src/styles.css"), resolve(dist, "styles.css")),
]);
