# Modules

A Tantu program is a set of sibling `*.tn` files in one directory. `import name` makes the members
of `name.tn` available under a `name.` prefix.

::: tip Playground note
The playground has a single editor, so the multi-file examples on this page are marked so; run
them locally with `python -m tantu run main.tn`. Everything else in these docs runs in the browser.
:::

```tantu noplay
# mathlib.tn
fn square(n: Int) -> Int:
    n * n

let answer = 42
```

```tantu noplay
# main.tn
import mathlib

fn main() -> Unit:
    print(mathlib.square(5))   # 25
    print(mathlib.answer)      # 42
```

## How a program is assembled

Running `tantu run main.tn`:

1. **Discovers** the import graph starting from the root file.
2. **Checks** each module in dependency order (a module is checked after everything it imports).
3. **Links** every module's globals into one flat table.
4. **Initializes** each module's top-level bindings, dependencies first.
5. Calls the root module's `main()`.

## What you can import

In v1, imports are **value-only**: you can use another module's functions and its top-level `let`
bindings (and the nominal types in their signatures). Sharing enums, structs, and their
constructors across modules is deferred past v1; define those in the module that uses them.

## Errors

Import mistakes are caught at compile time:

- An **import cycle** is `E0130`.
- A **missing module** file is `E0131`.
- Accessing a name the module doesn't define is `E0132`.
- Using a module name as a value (instead of `module.member`) is `E0133`.

`import` needs real files on disk, so it isn't available for stdin or the REPL (`E0134`).
