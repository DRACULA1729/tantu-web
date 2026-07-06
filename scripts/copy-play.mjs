#!/usr/bin/env node
// Build the playground and copy its dist into docs/public/play so the combined site serves it at
// /play/. The playground uses Vite base "./" (relative assets), so it works at any mount point.
import { execFileSync } from "node:child_process";
import { cpSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, "..");
const playground = join(web, "playground");
const dist = join(playground, "dist");
const dest = join(web, "docs", "public", "play");

console.log("[copy-play] building playground…");
execFileSync("npm", ["run", "build"], { cwd: playground, stdio: "inherit" });
if (!existsSync(dist)) {
  console.error("[copy-play] ERROR: playground build produced no dist/");
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(dist, dest, { recursive: true });
console.log(`[copy-play] copied playground → docs/public/play/`);
