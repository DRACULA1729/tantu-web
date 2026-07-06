/// <reference lib="webworker" />
// Pyodide worker: boots CPython-in-WASM, installs the weft wheel, loads the facade, then runs
// evaluate(source) on demand. Kept as a module worker so the runaway-loop watchdog on the main
// thread can terminate() and respawn it. The Pyodide runtime is fetched from the jsDelivr CDN;
// only the weft wheel is served same-origin (its absolute URL is passed in the init message).
import facadeSource from "./facade.py?raw";

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

type InitMsg = { type: "init"; wheelURL: string };
type RunMsg = { type: "run"; id: number; source: string; stepLimit?: number };
type InMsg = InitMsg | RunMsg;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodide: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let evaluateFn: any = null;
let ready: Promise<void> | null = null;

async function boot(wheelURL: string): Promise<void> {
  const { loadPyodide } = await import(
    /* @vite-ignore */ `${PYODIDE_CDN}pyodide.mjs`
  );
  pyodide = await loadPyodide({ indexURL: PYODIDE_CDN });
  await pyodide.loadPackage("micropip");
  const micropip = pyodide.pyimport("micropip");
  await micropip.install(wheelURL);
  // Define the facade once; grab a handle to evaluate() for per-run calls.
  pyodide.runPython(facadeSource);
  evaluateFn = pyodide.globals.get("evaluate");
  postMessage({ type: "ready" });
}

self.onmessage = async (e: MessageEvent<InMsg>) => {
  const msg = e.data;

  if (msg.type === "init") {
    ready = boot(msg.wheelURL).catch((err) => {
      postMessage({ type: "boot-error", error: String(err?.message ?? err) });
      throw err;
    });
    return;
  }

  if (msg.type === "run") {
    try {
      if (ready) await ready;
      if (!evaluateFn) throw new Error("interpreter not ready");
      // evaluate() returns a Python dict → toJs to a plain JS object.
      const resultProxy = evaluateFn(
        msg.source,
        msg.stepLimit ?? 2_000_000
      );
      const result =
        resultProxy && typeof resultProxy.toJs === "function"
          ? resultProxy.toJs({ dict_converter: Object.fromEntries })
          : resultProxy;
      if (resultProxy && typeof resultProxy.destroy === "function") {
        resultProxy.destroy();
      }
      postMessage({ type: "result", id: msg.id, result });
    } catch (err) {
      postMessage({
        type: "error",
        id: msg.id,
        error: String((err as Error)?.message ?? err),
      });
    }
  }
};
