# Tantu playground facade; lives in the PLAYGROUND repo, not the language repo.
#
# Executed once in the Pyodide worker via runPython, then JS calls evaluate(source) per Run.
# It reuses tantu's own public APIs and returns ONE JSON-able dict so the JS<->Python boundary is a
# single round-trip. A virtual clock makes sleep()/channel programs finish instantly and
# deterministically (mirrors tests/harness.py::_VirtualClock). step_limit turns a runaway loop into
# an in-band panic (R008) instead of hanging the worker.
import io

from tantu.lexer import tokenize
from tantu.parser import parse
from tantu.checker import check
from tantu.compiler import compile_module
from tantu.vm import VM
from tantu.errors import TantuError, CheckErrors, render_error, render_errors

_FILE = "playground.tn"


class _Clock:
    """Deterministic clock: time advances only when a fiber sleeps."""

    def __init__(self):
        self.t = 0.0

    def now(self):
        return self.t

    def sleep(self, dt):
        self.t += max(0.0, dt)


def evaluate(source, step_limit=2_000_000):
    """Compile + run one module. Returns {stdout, stderr, exit, tokens, ast, dis}.

    Each pipeline field is best-effort: a later stage failing still surfaces the earlier stages
    that succeeded, so the Tokens/AST/Bytecode tabs stay useful even on a compile error.
    """
    result = {"stdout": "", "stderr": "", "exit": 0,
              "tokens": None, "ast": None, "dis": None}

    # --- inspector fields (each stage may fail; capture what succeeds) ---
    try:
        toks = tokenize(source, _FILE)
        result["tokens"] = [repr(t) for t in toks]
        mod = parse(toks)
        result["ast"] = mod.pretty()
        checked = check(mod)
        code = compile_module(checked)
        result["dis"] = code.dis()
    except (TantuError, CheckErrors):
        pass  # the run path below re-runs the pipeline and renders the error properly

    # --- run path: reuse the CLI's exact behavior on a virtual clock ---
    out = io.StringIO()
    err = io.StringIO()
    try:
        code = compile_module(check(parse(tokenize(source, _FILE))))
        clk = _Clock()
        vm = VM(stdout=out, clock=clk.now, sleep_fn=clk.sleep)
        # VM renders runtime panics (including the R008 step-limit panic) to stdout itself and
        # returns exit code 1; compile errors are caught here and rendered to stderr as exit 2.
        result["exit"] = vm.run(code, source, _FILE, step_limit=step_limit)
    except CheckErrors as e:
        err.write(render_errors(source, e.errors) + "\n")
        result["exit"] = 2
    except TantuError as e:
        err.write(render_error(source, e) + "\n")
        result["exit"] = 2

    result["stdout"] = out.getvalue()
    result["stderr"] = err.getvalue()
    return result
