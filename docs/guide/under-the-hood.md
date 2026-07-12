# Under the hood

Tantu isn't magic: it's a small, readable pipeline you can watch run. This page sketches what
happens between the text you write and the output you see, and points you at the playground's
inspector so you can see each stage for yourself.

## The pipeline

```
source ─▶ lexer ─▶ parser ─▶ checker ─▶ compiler ─▶ linker ─▶ stack VM
         tokens     AST      typed AST   bytecode    program    output
```

1. **Lexer** turns the source text into a stream of tokens, handling indentation by emitting
   `INDENT`/`DEDENT` tokens.
2. **Parser** builds an abstract syntax tree (AST) from the tokens.
3. **Checker** type-checks the AST (scopes, inference, exhaustiveness, the no-null and
   immutability rules), annotating the tree in place. Every error you've seen in this guide comes
   from here (or the two stages before it).
4. **Compiler** walks the checked AST and emits **bytecode** for a stack machine.
5. **Linker** stitches modules' globals into one flat table.
6. **VM** executes the bytecode instruction by instruction, with a cooperative scheduler driving
   fibers and channels.

## See it in the playground

The [playground](/play/){target="_blank" rel="noopener"} exposes three of these stages as tabs, for whatever code
is in the editor:

- **Tokens**: the lexer's output.
- **AST**: the parsed tree, pretty-printed.
- **Bytecode**: the compiler's disassembly (the same thing `python -m tantu dis` prints).

Try this program, then flip through the tabs to watch it turn into tokens, a tree, and finally
stack instructions:

```tantu
fn main() -> Unit:
    let x = 2 + 3 * 4
    print(x)
```

## Values at runtime

Types are **erased** before execution: the VM works with plain runtime values (integers, strings,
lists, tuples, records, variants, closures, channels). Soundness is guaranteed by the checker
*before* anything runs, so the VM never needs to ask "what type is this?". That's also why generics
cost nothing at runtime: a generic function is just one ordinary function.

## Why a bytecode VM?

Tantu is built from scratch to be understandable end to end: a hand-written lexer and parser (no
parser generator), an explicit type checker, a compact instruction set, and a stack VM with a
cooperative scheduler, all in pure Python with no third-party runtime dependencies. The
[playground](/play/){target="_blank" rel="noopener"} runs that exact interpreter, compiled to WebAssembly, in your
browser.
