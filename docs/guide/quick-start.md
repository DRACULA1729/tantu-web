# Quick start

The fastest way to try Tantu is the **[playground](/play/){target="_blank" rel="noopener"}** — it runs the real
interpreter in your browser, with no install. Every code block in these docs has a **Try it **
button (hover to reveal it) that opens the snippet there.

## Hello, world

```tantu
fn main() -> Unit:
    print("hello, world")
```

Every program starts at `fn main()`. The `-> Unit` return type means "returns nothing"; you can
omit it and Tantu infers `Unit`. Blocks are defined by **indentation** (spaces only — tabs are an
error), just like Python.

## A first real program

```tantu
fn greet(name: Str) -> Str:
    return "Hello, " + name + "!"

fn main() -> Unit:
    print(greet("Tantu"))
    let nums = [1, 2, 3, 4, 5]
    var total = 0
    for n in nums:
        total = total + n * n
    print(total)
```

A few things to notice:

- `let` binds an **immutable** value; `var` binds a mutable one. Reach for `let` by default.
- Function parameter and return types are **required** — that is the boundary where you tell the
  checker what you mean; the bodies are inferred from there.
- `+` concatenates strings and adds numbers; lists are joined with `concat` (see
  [Builtins](/reference/builtins)).

## Running Tantu locally

The playground is the real interpreter, but you can also run Tantu from the command line:

```sh
python -m tantu run file.tn     # run a program (use `run -` to read stdin)
python -m tantu check file.tn   # type-check only, no run
python -m tantu dis file.tn     # disassemble to bytecode
python -m tantu                   # REPL
```

Exit codes are meaningful: **0** success, **1** a runtime panic, **2** a compile-time (lex, parse,
or type) error.

## Where to next

- The [Language tour](/guide/tour) walks through the whole language with runnable examples.
- [Types & no-null](/guide/types) explains how Tantu models absence and failure.
- [Concurrency](/guide/concurrency) covers fibers, channels, and `select`.
