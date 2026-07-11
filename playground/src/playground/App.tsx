import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { tantu } from "../editor/tantuLanguage";
import { TantuRunner, type EvalResult, type Status } from "../worker/client";
import { loadExamples, type Example } from "./examples";
import { readHashSource, shareURL } from "./share";

const DEFAULT_SOURCE = `# Welcome to the Tantu playground.
# Edit and press Run (Ctrl/Cmd+Enter). Explore Tokens / AST / Bytecode.

fn greet(name: Str) -> Str:
    return "Hello, " + name + "!"

fn main() -> Unit:
    print(greet("Tantu"))
    let nums = [1, 2, 3, 4, 5]
    var total = 0
    for n in nums:
        total = total + n * n
    print(total)
`;

type Tab = "output" | "tokens" | "ast" | "bytecode";
const TABS: { id: Tab; label: string }[] = [
  { id: "output", label: "Output" },
  { id: "tokens", label: "Tokens" },
  { id: "ast", label: "AST" },
  { id: "bytecode", label: "Bytecode" },
];

function exitLabel(exit: number): { text: string; cls: string } {
  if (exit === 0) return { text: "exit 0 · ok", cls: "ok" };
  if (exit === 1) return { text: "exit 1 · panic", cls: "panic" };
  return { text: "exit 2 · compile error", cls: "compile" };
}

export default function App() {
  const [source, setSource] = useState<string>(
    () => readHashSource() ?? DEFAULT_SOURCE
  );
  const [status, setStatus] = useState<Status>("booting");
  const [statusDetail, setStatusDetail] = useState<string>("");
  const [result, setResult] = useState<EvalResult | null>(null);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<Tab>("output");
  const [notice, setNotice] = useState<string>("");
  const [examples, setExamples] = useState<Example[]>([]);
  const runnerRef = useRef<TantuRunner | null>(null);

  useEffect(() => {
    const runner = new TantuRunner((s, detail) => {
      setStatus(s);
      setStatusDetail(detail ?? "");
    });
    runnerRef.current = runner;
    runner.init().catch((e) => {
      setStatus("error");
      setStatusDetail(String(e?.message ?? e));
    });
    loadExamples().then(setExamples);
  }, []);

  const run = useCallback(async () => {
    const runner = runnerRef.current;
    if (!runner || running) return;
    setRunning(true);
    setNotice("");
    const outcome = await runner.run(source);
    if (outcome.kind === "ok") {
      setResult(outcome.result);
      setTab("output");
    } else if (outcome.kind === "timeout") {
      setResult(null);
      setNotice("Execution timed out (possible infinite loop). The interpreter was restarted.");
    } else {
      setResult(null);
      setNotice("Error: " + outcome.error);
    }
    setRunning(false);
  }, [source, running]);

  const share = useCallback(async () => {
    const url = shareURL(source);
    history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Share link copied to clipboard.");
    } catch {
      setNotice("Share link is in the address bar.");
    }
  }, [source]);

  const keymap = useMemo(
    () =>
      EditorView.domEventHandlers({
        keydown: (e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            run();
            return true;
          }
          return false;
        },
      }),
    [run]
  );

  const extensions = useMemo(() => [tantu(), keymap, EditorView.lineWrapping], [keymap]);

  const busy = status !== "ready";

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">⋈</span> Tantu <span className="sub">Playground</span>
        </div>
        <div className="actions">
          <select
            className="examples"
            value=""
            onChange={(e) => {
              const ex = examples.find((x) => x.name === e.target.value);
              if (ex) {
                setSource(ex.source);
                setNotice("");
              }
              e.target.value = "";
            }}
          >
            <option value="">Examples…</option>
            {examples.map((ex) => (
              <option key={ex.name} value={ex.name}>
                {ex.title}
              </option>
            ))}
          </select>
          <button className="btn ghost" onClick={share}>
            Share
          </button>
          <button className="btn run" onClick={run} disabled={busy || running}>
            {running ? "Running…" : busy ? "Booting…" : "▶ Run"}
          </button>
        </div>
      </header>

      <div className="statusline">
        <span className={"dot " + status} />
        {status === "booting" && "Booting interpreter (Pyodide)…"}
        {status === "ready" && "Interpreter ready"}
        {status === "error" && "Interpreter failed to load: " + statusDetail}
        <span className="hint">Ctrl/Cmd + Enter to run</span>
      </div>

      <main className="panes">
        <section className="editor-pane">
          <CodeMirror
            value={source}
            height="100%"
            theme="dark"
            extensions={extensions}
            onChange={setSource}
            basicSetup={{ lineNumbers: true, foldGutter: false }}
          />
        </section>

        <section className="output-pane">
          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={"tab" + (tab === t.id ? " active" : "")}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
            {result && tab === "output" && (
              <span className={"badge " + exitLabel(result.exit).cls}>
                {exitLabel(result.exit).text}
              </span>
            )}
          </div>

          <div className="tab-body">
            {notice && <div className="notice">{notice}</div>}
            {!result && !notice && (
              <div className="placeholder">Press Run to execute.</div>
            )}
            {result && tab === "output" && (
              <pre className="output">
                {result.stdout}
                {result.stderr && <span className="stderr">{result.stderr}</span>}
                {!result.stdout && !result.stderr && (
                  <span className="placeholder">(no output)</span>
                )}
              </pre>
            )}
            {result && tab === "tokens" && (
              <pre className="output">
                {result.tokens ? result.tokens.join("\n") : "(lexing failed)"}
              </pre>
            )}
            {result && tab === "ast" && (
              <pre className="output">{result.ast ?? "(parse failed)"}</pre>
            )}
            {result && tab === "bytecode" && (
              <pre className="output">{result.dis ?? "(compile failed)"}</pre>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
