#!/usr/bin/env node
// One-shot combined build: generates docs assets, builds the playground into docs/public/play,
// then builds the VitePress site. Output: docs/.vitepress/dist/ (docs at /, playground at /play/).
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, "..");
const docs = join(web, "docs");
// The docs generator is stdlib-only, so any python3 works when the local build venv is absent
// (CI/Netlify, where it imports the language modules from the vendored wheel).
const venvPython = join(web, ".build-venv", "bin", "python");
const buildPython = existsSync(venvPython) ? venvPython : "python3";

const run = (cmd, args, cwd) => {
  console.log(`\n ${cmd} ${args.join(" ")}  (cwd: ${cwd})`);
  execFileSync(cmd, args, { cwd, stdio: "inherit" });
};

// 1. Generate the Shiki grammar + reference partials from the (read-only) language repo.
run(buildPython, [join(web, "scripts", "build-docs-assets.py")], web);
// 2. Build the playground and copy it into docs/public/play (this also rebuilds the wheel+examples).
run("node", [join(web, "scripts", "copy-play.mjs")], web);
// 3. Build the VitePress site (docs/package.json "build" = vitepress build).
run("npm", ["run", "build"], docs);

console.log("\n✅ Combined site built → docs/.vitepress/dist/ (docs at /, playground at /play/)");
