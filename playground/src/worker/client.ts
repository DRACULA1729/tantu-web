// Main-thread facade over the Pyodide worker: boot management, the runaway-loop watchdog, and a
// promise-based run() API. Keeps ONE warm worker; only respawns after a timeout kill.
import PyodideWorker from "./pyodide.worker.ts?worker";

export interface EvalResult {
  stdout: string;
  stderr: string;
  exit: number;
  tokens: string[] | null;
  ast: string | null;
  dis: string | null;
}

export type RunOutcome =
  | { kind: "ok"; result: EvalResult }
  | { kind: "timeout" }
  | { kind: "error"; error: string };

export type Status = "booting" | "ready" | "error";

const WATCHDOG_MS = 5000;

export class WeftRunner {
  private worker: Worker | null = null;
  private wheelURL = "";
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (o: RunOutcome) => void; timer: number }
  >();
  private onStatus: (s: Status, detail?: string) => void;

  constructor(onStatus: (s: Status, detail?: string) => void) {
    this.onStatus = onStatus;
  }

  async init(): Promise<void> {
    const base = import.meta.env.BASE_URL;
    const manifestURL = new URL(base + "weft-wheel.json", location.href).href;
    const manifest = await fetch(manifestURL).then((r) => {
      if (!r.ok) throw new Error(`cannot load weft-wheel.json (${r.status})`);
      return r.json();
    });
    this.wheelURL = new URL(base + manifest.wheel, location.href).href;
    this.spawn();
  }

  private spawn(): void {
    this.onStatus("booting");
    const worker = new PyodideWorker();
    worker.onmessage = (e: MessageEvent) => this.onMessage(e);
    worker.postMessage({ type: "init", wheelURL: this.wheelURL });
    this.worker = worker;
  }

  private onMessage(e: MessageEvent): void {
    const msg = e.data;
    if (msg.type === "ready") {
      this.onStatus("ready");
      return;
    }
    if (msg.type === "boot-error") {
      this.onStatus("error", msg.error);
      return;
    }
    if (msg.type === "result") {
      this.settle(msg.id, { kind: "ok", result: msg.result as EvalResult });
      return;
    }
    if (msg.type === "error") {
      this.settle(msg.id, { kind: "error", error: msg.error });
      return;
    }
  }

  private settle(id: number, outcome: RunOutcome): void {
    const entry = this.pending.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    this.pending.delete(id);
    entry.resolve(outcome);
  }

  /** Run source; resolves with output, a timeout (worker was killed + respawned), or an error. */
  run(source: string, stepLimit?: number): Promise<RunOutcome> {
    if (!this.worker) this.spawn();
    const id = this.nextId++;
    return new Promise<RunOutcome>((resolve) => {
      const timer = window.setTimeout(() => {
        // Watchdog fired: the in-band step cap didn't save us (or a facade hang). Hard-kill and
        // respawn a fresh warm worker so the next run works.
        this.pending.delete(id);
        this.worker?.terminate();
        this.worker = null;
        this.spawn();
        resolve({ kind: "timeout" });
      }, WATCHDOG_MS);
      this.pending.set(id, { resolve, timer });
      this.worker!.postMessage({ type: "run", id, source, stepLimit });
    });
  }
}
