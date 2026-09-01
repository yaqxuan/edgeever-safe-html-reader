import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
if (!existsSync(chromePath)) throw new Error(`Google Chrome was not found at ${chromePath}`);

const servedFiles = new Map([
  ["/tests/browser-harness.html", resolve(root, "tests/browser-harness.html")],
  ["/tests/browser-harness.js", resolve(root, "tests/browser-harness.js")],
  ["/main.js", resolve(root, "main.js")],
  ["/styles.css", resolve(root, "styles.css")],
]);
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
]);

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  const file = servedFiles.get(pathname);
  if (!file) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": contentTypes.get(extname(file)) ?? "application/octet-stream" });
  response.end(readFileSync(file));
});

const listen = () => new Promise((resolveListen, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => resolveListen(server.address()));
});

const runChrome = (url, profileDirectory) => new Promise((resolveRun, reject) => {
  const child = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profileDirectory}`,
    "--virtual-time-budget=3000",
    "--dump-dom",
    url,
  ], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.once("error", reject);
  child.once("close", (code) => resolveRun({ code, stdout, stderr }));
});

const profileDirectory = await mkdtemp(join(tmpdir(), "edgeever-safe-html-reader-e2e-"));
try {
  const address = await listen();
  if (!address || typeof address === "string") throw new Error("Browser test server did not expose a TCP port.");
  const result = await runChrome(`http://127.0.0.1:${address.port}/tests/browser-harness.html`, profileDirectory);
  if (result.code !== 0 || !result.stdout.includes('data-passed="true"')) {
    throw new Error(`Browser E2E failed (exit ${result.code}).\n${result.stdout}\n${result.stderr}`);
  }
  const match = result.stdout.match(/<pre id="test-results">([^<]+)<\/pre>/);
  console.log("Browser E2E passed:", match?.[1] ?? "result marker present");
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
  await rm(profileDirectory, { recursive: true, force: true });
}
