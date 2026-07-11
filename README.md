# Tantu Web

The **playground** and **documentation site** for the [Tantu](../Combined%20Interpreter) language.
The playground lets you write Tantu, run it, and inspect the compiler pipeline (tokens → AST →
bytecode); the **real** interpreter runs in the browser via [Pyodide](https://pyodide.org)
(CPython-in-WASM), no backend. The docs are a VitePress site whose runnable snippets link straight
into the playground.

This is a standalone project. The language repo (`../Combined Interpreter`) is treated as
**read-only**: all assets (wheel, examples, grammar, reference tables) are generated from it by
scripts, never modified in place.

## Layout

```
tantu-web/
  playground/        React + Vite + TypeScript playground
    public/          built wheel + examples (generated — see below)
    src/worker/      Pyodide worker + facade.py + main-thread client (watchdog, respawn)
    src/editor/      CodeMirror 6 Tantu StreamLanguage
    src/playground/  App, tabs, examples gallery, share-by-URL
  docs/              VitePress docs site (guide + generated references)
    .vitepress/      config (nav, Shiki tantu grammar, the "Try it " plugin) + theme
    guide/, reference/
    public/play/     the built playground, mounted here (generated)
  scripts/
    build-tantu-assets.mjs   builds the tantu wheel + copies examples into playground/public/
    build-docs-assets.py    generates the Shiki grammar + error/builtin reference tables
    copy-play.mjs           builds the playground and copies it into docs/public/play/
    build-site.mjs          one-shot combined build (docs at /, playground at /play/)
  .build-venv/       Python venv used to build the wheel + run the docs generator (create once)
```

## Docs site

```sh
cd docs
npm install
npm run dev        # generates assets + copies the playground, then vitepress dev
```

Build the whole combined site (docs at `/`, playground at `/play/`) in one shot:

```sh
node scripts/build-site.mjs   # output → docs/.vitepress/dist/
```

- **Generated, never hand-maintained:** the Shiki `tantu` grammar comes from `tantu/tokens.py`; the
  builtins table from Appendix A / `BUILTIN_SIGS`; the error-code table from every constant in
  `tantu/errors.py` merged with curated one-liners in `docs/reference/error-descriptions.json`. The
  generator **fails loudly** if a language error code has no description, so docs can't silently
  drift behind the language.
- **"Try it ":** a markdown-it plugin appends a button to every runnable ` ```tantu ` block linking
  to `{base}play/#code=<base64url>` (the Phase-1 share format). Tag a block ` ```tantu noplay ` to
  highlight it without a button (error demos, multi-file module snippets).
- VitePress dev doesn't rebuild the playground; `npm run dev` copies a prebuilt `play/` into
  `public/` first, so "Try it" uses that static copy in dev.

## Prerequisites

- Node 18+
- Python 3.12+ (for building the wheel)
- A one-time build venv:

  ```sh
  python3 -m venv .build-venv
  .build-venv/bin/pip install build setuptools wheel
  ```

## Develop

```sh
cd playground
npm install
npm run dev        # runs the asset build, then starts Vite on :5173
```

`npm run dev` / `npm run build` both run `scripts/build-tantu-assets.mjs` first, which:

1. copies `../Combined Interpreter/{pyproject.toml,tantu/}` into a temp dir and builds the wheel
   **there** (so the language repo is never written to — no `build/` or `*.egg-info`),
2. copies the wheel + a `tantu-wheel.json` manifest into `playground/public/`,
3. copies `../Combined Interpreter/examples/*.tn` into `playground/public/examples/` and writes
   an `index.json` the examples gallery fetches.

Re-run it (`npm run assets`) whenever the language changes to resync the wheel + examples — it is
the single seam between the two repos.

**Vendored assets:** the wheel, `tantu-wheel.json`, and `playground/public/examples/` are
*committed*, not just generated, so the repo builds standalone when the language repo isn't
checked out next to it (CI, Netlify, a bare clone). Without `../Combined Interpreter`,
`build-tantu-assets.mjs` uses the vendored copies as-is and `build-docs-assets.py` imports the
language modules straight from the vendored wheel (a pure-Python wheel is zip-importable). After
resyncing with `npm run assets`, commit the changed assets.

## Deploy (Netlify)

`netlify.toml` builds the combined site with `node scripts/build-site.mjs` (installing
playground/ and docs/ deps first) and publishes `docs/.vitepress/dist/`. Thanks to the vendored
assets this needs only Node + a stock `python3` — no language repo, no `.build-venv`. Pushing a
new wheel to production = `npm run assets` in `playground/`, commit, push.

## How it runs Tantu

`src/worker/pyodide.worker.ts` boots Pyodide (from the jsDelivr CDN), `micropip.install`s the
same-origin wheel, then runs `src/worker/facade.py` once. Each Run calls the facade's
`evaluate(source)`, which returns `{stdout, stderr, exit, tokens, ast, dis}` in one round-trip by
reusing tantu's own `tokenize` / `parse` / `check` / `compile_module` / `VM` APIs. A virtual clock
makes `sleep`/channel programs finish instantly and deterministically.

### Infinite-loop safety (two layers)

1. **In-band:** the facade passes `step_limit` to `VM.run`; a runaway `loop:` trips a graceful
   `R008` panic (this is the one small, backward-compatible enhancement made to the language repo —
   see its `DECISIONS.md` and `tests/test_step_limit.py`).
2. **Watchdog:** the main thread also enforces a ~5s wall-clock limit; on expiry it terminates the
   Pyodide worker and respawns a warm one, reporting "execution timed out".

## Share links

Source is encoded in the URL hash as `#code=<base64url(source)>`. This format is the contract the
Phase-2 docs site's "Try it " links build against — keep it stable.
