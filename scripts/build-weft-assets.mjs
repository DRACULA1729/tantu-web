#!/usr/bin/env node
// Build the weft wheel + copy examples into the playground's public/ assets.
//
// The language repo (../../Combined Interpreter) is treated as STRICTLY READ-ONLY: we copy its
// pyproject.toml + weft/ package into a throwaway temp dir and build the wheel THERE, so no
// build/ or *.egg-info is ever written into the language repo. Re-run this whenever the language
// changes to resync the wheel + examples with the playground.
//
// Requires a build venv at weft-web/.build-venv with `build` + `setuptools` + `wheel` installed:
//   python3 -m venv weft-web/.build-venv
//   weft-web/.build-venv/bin/pip install build setuptools wheel

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, cpSync, rmSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");
const langRepo = resolve(webRoot, "..", "Combined Interpreter");
const publicDir = resolve(webRoot, "playground", "public");
const examplesOut = join(publicDir, "examples");
const buildPython = join(webRoot, ".build-venv", "bin", "python");

function fail(msg) {
  console.error(`[build-weft-assets] ERROR: ${msg}`);
  process.exit(1);
}

if (!existsSync(langRepo)) fail(`language repo not found at ${langRepo}`);
if (!existsSync(join(langRepo, "pyproject.toml"))) fail(`pyproject.toml not found in ${langRepo}`);
if (!existsSync(buildPython)) {
  fail(
    `build venv missing at ${buildPython}\n` +
      `  create it:  python3 -m venv "${join(webRoot, ".build-venv")}" && ` +
      `"${join(webRoot, ".build-venv", "bin", "pip")}" install build setuptools wheel`
  );
}

// 1. Build the wheel in an isolated copy of the package (language repo stays untouched).
const work = mkdtempSync(join(tmpdir(), "weft-build-"));
try {
  console.log("[build-weft-assets] copying package into temp build dir…");
  cpSync(join(langRepo, "pyproject.toml"), join(work, "pyproject.toml"));
  cpSync(join(langRepo, "weft"), join(work, "weft"), {
    recursive: true,
    filter: (src) => !src.includes("__pycache__"),
  });

  const wheelsDir = join(work, "_wheels");
  mkdirSync(wheelsDir);
  console.log("[build-weft-assets] building wheel…");
  execFileSync(buildPython, ["-m", "build", "--wheel", "--no-isolation", "--outdir", wheelsDir, work], {
    stdio: "inherit",
    cwd: work,
  });

  const wheel = readdirSync(wheelsDir).find((f) => f.endsWith(".whl"));
  if (!wheel) fail("no .whl produced by the build");

  mkdirSync(publicDir, { recursive: true });
  cpSync(join(wheelsDir, wheel), join(publicDir, wheel));
  // The worker reads this manifest to learn the exact wheel filename (version-agnostic).
  writeFileSync(join(publicDir, "weft-wheel.json"), JSON.stringify({ wheel }, null, 2) + "\n");
  console.log(`[build-weft-assets] wheel → public/${wheel}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}

// 2. Copy examples/*.weft and emit an index the gallery can fetch (no dir listing at runtime).
const srcExamples = join(langRepo, "examples");
mkdirSync(examplesOut, { recursive: true });
const index = [];
if (existsSync(srcExamples)) {
  for (const f of readdirSync(srcExamples).filter((f) => f.endsWith(".weft")).sort()) {
    const source = readFileSync(join(srcExamples, f), "utf8");
    writeFileSync(join(examplesOut, f), source);
    index.push({ name: f, title: f.replace(/\.weft$/, ""), source });
  }
}
writeFileSync(join(examplesOut, "index.json"), JSON.stringify(index, null, 2) + "\n");
console.log(`[build-weft-assets] copied ${index.length} example(s) → public/examples/`);
console.log("[build-weft-assets] done.");
