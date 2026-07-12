<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/tantu-file-dark.svg">
    <img src="assets/tantu-file-light.svg" width="96" alt="Tantu logo">
  </picture>
</p>

# Tantu Web

The documentation site and in-browser playground for [Tantu](https://github.com/DRACULA1729/tantu-lang),
a statically-typed, Python-readable language with fibers and channels.

**Live site: <https://tantu-play.netlify.app>**

- **[Guide & reference](https://tantu-play.netlify.app)** — a tutorial from `hello.tn` through
  concurrency and generics, plus generated reference tables for every builtin and error code.
- **[Playground](https://tantu-play.netlify.app/play/)** — write Tantu and run it in your browser.
  No install, no backend: [Pyodide](https://pyodide.org) (CPython compiled to WebAssembly) installs
  the real `tantu` wheel and runs your program with the same interpreter the CLI uses. You can
  inspect each compiler stage (Tokens / AST / Bytecode tabs), load the example programs, and share
  code with a link — the source travels in the URL hash.

Runnable code blocks in the docs carry a "Try it" button that opens them in the playground.

Everything below is for people working on this repo.

## Layout

```
tantu-web/
  playground/        React + Vite + TypeScript playground
    public/          tantu wheel + example programs (vendored; see below)
    src/worker/      Pyodide worker + facade.py + main-thread client (watchdog, respawn)
    src/editor/      CodeMirror 6 Tantu language mode
    src/playground/  App, tabs, examples gallery, share-by-URL
  docs/              VitePress docs site (guide + generated references)
    .vitepress/      config (nav, Shiki tantu grammar, the "Try it" plugin) + theme
    guide/, reference/
    public/play/     the built playground, mounted here (generated)
  scripts/
    build-tantu-assets.mjs  builds the tantu wheel + copies examples into playground/public/
    build-docs-assets.py    generates the Shiki grammar + error/builtin reference tables
    copy-play.mjs           builds the playground and copies it into docs/public/play/
    build-site.mjs          one-shot combined build (docs at /, playground at /play/)
  .build-venv/       Python venv used to build the wheel + run the docs generator
```

## Running it locally

You need Node 18+ and Python 3.12+.

Playground only:

```sh
cd playground
npm install
npm run dev        # rebuilds assets, then starts Vite on :5173
```

Docs site (includes the playground under `/play/`):

```sh
cd docs
npm install
npm run dev        # generates assets + copies a built playground, then vitepress dev
```

Full combined build, same as production:

```sh
node scripts/build-site.mjs   # output → docs/.vitepress/dist/
```

## How this repo connects to the language repo

`scripts/build-tantu-assets.mjs` is the single seam between the two repos. When a checkout of
tantu-lang is available (a sibling directory by default; point `TANTU_LANG_REPO` at any other
path), the script copies `pyproject.toml` and the `tantu/` package into a temp dir, builds the
wheel there (the language repo is never written to), and copies the wheel plus `examples/*.tn`
into `playground/public/`. Re-run it with `npm run assets` whenever the language changes.

The wheel, `tantu-wheel.json`, and the examples are *committed*, not just generated. That way the
repo builds standalone when the language repo isn't checked out next to it (CI, Netlify, a bare
clone): the build script falls back to the vendored copies, and `build-docs-assets.py` imports the
language modules straight from the vendored wheel, which is zip-importable because it's pure
Python. A workflow in tantu-lang pushes fresh assets here on every merge to its `master`.

Generated things stay generated. The Shiki `tantu` grammar comes from `tantu/tokens.py`, the
builtins table from the language's builtin signatures, and the error-code table from every
constant in `tantu/errors.py` merged with the curated one-liners in
`docs/reference/error-descriptions.json`. The generator fails loudly if an error code has no
description, so the docs can't silently drift behind the language.

## How the playground runs Tantu

`src/worker/pyodide.worker.ts` boots Pyodide from the jsDelivr CDN, installs the same-origin
wheel with micropip, then loads `src/worker/facade.py`. Each Run calls the facade's
`evaluate(source)`, which reuses tantu's own `tokenize` / `parse` / `check` / `compile_module` /
`VM` APIs and returns `{stdout, stderr, exit, tokens, ast, dis}` in one round-trip. A virtual
clock makes `sleep` and channel programs finish instantly and deterministically.

Two layers guard against infinite loops:

1. In-band: the facade passes `step_limit` to `VM.run`, so a runaway `loop:` trips a graceful
   `R008` panic instead of hanging.
2. Watchdog: the main thread enforces a ~5s wall-clock limit, terminates the worker on expiry,
   and respawns a warm one.

Share links encode the source as `#code=<base64url(source)>`. The docs site's "Try it" buttons
build against this format, so keep it stable.

## Deploy

`netlify.toml` builds the combined site with `node scripts/build-site.mjs` and publishes
`docs/.vitepress/dist/`. Thanks to the vendored assets this needs only Node and a stock
`python3` — no language checkout, no `.build-venv`. Shipping a new wheel to production is:
`npm run assets` in `playground/`, commit, push.
