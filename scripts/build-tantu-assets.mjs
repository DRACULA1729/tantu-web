#!/usr/bin/env node
// Build the tantu wheel + copy examples into the playground's public/ assets.
//
// The language repo (../../Combined Interpreter) is treated as STRICTLY READ-ONLY: we copy its
// pyproject.toml + tantu/ package into a throwaway temp dir and build the wheel THERE, so no
// build/ or *.egg-info is ever written into the language repo. Re-run this whenever the language
// changes to resync the wheel + examples with the playground.
//
// Requires a build venv at tantu-web/.build-venv with `build` + `setuptools` + `wheel` installed:
//   python3 -m venv tantu-web/.build-venv
//   tantu-web/.build-venv/bin/pip install build setuptools wheel

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, cpSync, rmSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");
const langRepo = resolve(process.env.TANTU_LANG_REPO ?? resolve(webRoot, "..", "Combined Interpreter"));
const publicDir = resolve(webRoot, "playground", "public");
const examplesOut = join(publicDir, "examples");
const buildPython = join(webRoot, ".build-venv", "bin", "python");

function fail(msg) {
  console.error(`[build-tantu-assets] ERROR: ${msg}`);
  process.exit(1);
}

// Without the language repo (CI, Netlify, a bare clone), fall back to the vendored assets
// committed in playground/public/. Regeneration only happens when the repo is present.
if (!existsSync(langRepo)) {
  const manifest = join(publicDir, "tantu-wheel.json");
  if (!existsSync(manifest)) {
    fail(`language repo not found at ${langRepo} and no vendored ${manifest} to fall back to`);
  }
  const { wheel } = JSON.parse(readFileSync(manifest, "utf8"));
  if (!existsSync(join(publicDir, wheel))) fail(`vendored wheel ${wheel} missing from ${publicDir}`);
  if (!existsSync(join(examplesOut, "index.json"))) fail(`vendored examples/index.json missing from ${examplesOut}`);
  console.log(`[build-tantu-assets] language repo not found — using vendored ${wheel} + examples/`);
  process.exit(0);
}
if (!existsSync(join(langRepo, "pyproject.toml"))) fail(`pyproject.toml not found in ${langRepo}`);
if (!existsSync(buildPython)) {
  fail(
    `build venv missing at ${buildPython}\n` +
      `  create it:  python3 -m venv "${join(webRoot, ".build-venv")}" && ` +
      `"${join(webRoot, ".build-venv", "bin", "pip")}" install build setuptools wheel`
  );
}

// 1. Build the wheel in an isolated copy of the package (language repo stays untouched).
const work = mkdtempSync(join(tmpdir(), "tantu-build-"));
try {
  console.log("[build-tantu-assets] copying package into temp build dir…");
  cpSync(join(langRepo, "pyproject.toml"), join(work, "pyproject.toml"));
  cpSync(join(langRepo, "tantu"), join(work, "tantu"), {
    recursive: true,
    filter: (src) => !src.includes("__pycache__"),
  });

  const wheelsDir = join(work, "_wheels");
  mkdirSync(wheelsDir);
  console.log("[build-tantu-assets] building wheel…");
  execFileSync(buildPython, ["-m", "build", "--wheel", "--no-isolation", "--outdir", wheelsDir, work], {
    stdio: "inherit",
    cwd: work,
  });

  const wheel = readdirSync(wheelsDir).find((f) => f.endsWith(".whl"));
  if (!wheel) fail("no .whl produced by the build");

  mkdirSync(publicDir, { recursive: true });
  // Drop superseded wheels (version bumps) so the vendored set never accumulates stale ones.
  for (const old of readdirSync(publicDir).filter((f) => f.startsWith("tantu-") && f.endsWith(".whl"))) {
    rmSync(join(publicDir, old));
  }
  cpSync(join(wheelsDir, wheel), join(publicDir, wheel));
  // The worker reads this manifest to learn the exact wheel filename (version-agnostic).
  writeFileSync(join(publicDir, "tantu-wheel.json"), JSON.stringify({ wheel }, null, 2) + "\n");
  console.log(`[build-tantu-assets] wheel → public/${wheel}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}

// 2. Copy examples/*.tn and emit an index the gallery can fetch (no dir listing at runtime).
// Recreate the directory from scratch so examples removed from the language repo disappear too.
const srcExamples = join(langRepo, "examples");
rmSync(examplesOut, { recursive: true, force: true });
mkdirSync(examplesOut, { recursive: true });
const index = [];
if (existsSync(srcExamples)) {
  for (const f of readdirSync(srcExamples).filter((f) => f.endsWith(".tn")).sort()) {
    const source = readFileSync(join(srcExamples, f), "utf8");
    writeFileSync(join(examplesOut, f), source);
    index.push({ name: f, title: f.replace(/\.tn$/, ""), source });
  }
}
writeFileSync(join(examplesOut, "index.json"), JSON.stringify(index, null, 2) + "\n");
console.log(`[build-tantu-assets] copied ${index.length} example(s) → public/examples/`);
console.log("[build-tantu-assets] done.");
