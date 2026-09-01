import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const required = ["manifest.json", "main.js", "styles.css"];

for (const name of required) {
  await stat(resolve(dist, name));
}

const manifest = JSON.parse(await readFile(resolve(dist, "manifest.json"), "utf8"));
const mainJs = await readFile(resolve(dist, "main.js"), "utf8");
const mainSize = (await stat(resolve(dist, "main.js"))).size;
const stylesSize = (await stat(resolve(dist, "styles.css"))).size;

if (manifest.type !== "plugin" || manifest.apiVersion !== "1") {
  throw new Error("The built manifest is not an EdgeEver Plugin API v1 manifest.");
}
if (manifest.entry !== "./main.js") {
  throw new Error("The built manifest entry must be ./main.js.");
}
if (/\b(?:import|export)\s+(?:[^'\"]*?from\s*)?['\"]\.\.?\//.test(mainJs) || /import\s*\(\s*['\"]\.\.?\//.test(mainJs)) {
  throw new Error("main.js contains a relative module import and is not a single-file bundle.");
}
if (mainSize > 5 * 1024 * 1024) throw new Error("main.js exceeds EdgeEver's 5 MB limit.");
if (stylesSize > 1024 * 1024) throw new Error("styles.css exceeds EdgeEver's 1 MB limit.");

console.log(`Verified dist: main.js ${mainSize} bytes, styles.css ${stylesSize} bytes.`);
