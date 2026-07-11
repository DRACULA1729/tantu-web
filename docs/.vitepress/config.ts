import { defineConfig } from "vitepress";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type MarkdownIt from "markdown-it";

// The Tantu TextMate grammar is generated from the language repo by scripts/build-docs-assets.py.
const tantuGrammar = JSON.parse(
  readFileSync(fileURLToPath(new URL("./tantu.tmLanguage.json", import.meta.url)), "utf-8")
);

// Combined deploy: docs at the root, the playground mounted at /play/.
const BASE = process.env.DOCS_BASE ?? "/";

function base64url(s: string): string {
  return Buffer.from(s, "utf-8").toString("base64url");
}

// Append a "Try it " button to every ```tantu fence, linking to the playground with the snippet
// preloaded via the #code= share format (identical to playground/src/playground/share.ts).
function tryItPlugin(md: MarkdownIt): void {
  const defaultFence = md.renderer.rules.fence!;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const parts = token.info.trim().split(/\s+/);
    const rendered = defaultFence(tokens, idx, options, env, self);
    // Only runnable Tantu blocks get a button; `tantu noplay` (error demos, fragments) is still
    // highlighted but gets no button.
    if (parts[0] !== "tantu" || parts.includes("noplay")) return rendered;
    const href = `${BASE}play/#code=${base64url(token.content.replace(/\n$/, ""))}`;
    return (
      `<div class="tantu-block">` +
      rendered +
      `<a class="try-it" href="${href}" target="_blank" rel="noopener">Try it </a>` +
      `</div>`
    );
  };
}

// The playground is a static app copied into public/play. In `vitepress dev`, Vite's SPA fallback
// otherwise shadows the directory index at `${BASE}play/` (serving the docs 404 page), so rewrite
// the bare directory URL to its index.html before the fallback runs. `vitepress preview` and real
// static hosts already resolve this, so this only matters for the dev server.
const playDir = `${BASE}play/`;
const servePlayIndex = {
  name: "serve-play-index",
  configureServer(server: { middlewares: { use: (fn: any) => void } }) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const url = (req.url ?? "").split("?")[0];
      if (url === `${BASE}play` || url === playDir) {
        req.url = `${playDir}index.html`;
      }
      next();
    });
  },
};

export default defineConfig({
  title: "Tantu",
  description:
    "A statically-typed, Python-readable language with fibers and channels — compiled to bytecode and run on a hand-built stack VM.",
  base: BASE,
  cleanUrls: true,
  ignoreDeadLinks: [/^\/play/],
  vite: {
    plugins: [servePlayIndex],
  },
  markdown: {
    languages: [tantuGrammar as any],
    config: (md) => tryItPlugin(md),
  },
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/quick-start" },
      { text: "Reference", link: "/reference/builtins" },
      { text: "Playground", link: "/play/", target: "_blank", rel: "noopener" },
    ],
    sidebar: {
      "/": [
        {
          text: "Guide",
          items: [
            { text: "Introduction", link: "/" },
            { text: "Quick start", link: "/guide/quick-start" },
            { text: "Language tour", link: "/guide/tour" },
            { text: "Syntax", link: "/guide/syntax" },
            { text: "Types & no-null", link: "/guide/types" },
            { text: "Pattern matching", link: "/guide/pattern-matching" },
            { text: "Functions & closures", link: "/guide/functions" },
            { text: "Concurrency", link: "/guide/concurrency" },
            { text: "Modules", link: "/guide/modules" },
            { text: "Generics", link: "/guide/generics" },
            { text: "Under the hood", link: "/guide/under-the-hood" },
          ],
        },
        {
          text: "Reference",
          items: [
            { text: "Builtins", link: "/reference/builtins" },
            { text: "Error codes", link: "/reference/errors" },
          ],
        },
      ],
    },
    search: { provider: "local" },
    socialLinks: [],
  },
});
