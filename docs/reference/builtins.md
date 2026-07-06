# Builtins reference

Weft's builtins are callable names available in every program — no import needed. A few (`chan`,
`send`, `recv`, `close`, `sleep`, `print`) are compiler intrinsics backed by dedicated bytecode;
the rest are ordinary library functions. Referencing a builtin outside call position is a compile
error — they aren't first-class values.

In the signatures below, `T` and `U` stand for any type.

<!--@include: ./_builtins.generated.md-->

::: info Generated
This table is generated from the language's builtin registry (`weft/prelude.py`) and Appendix A of
the design spec, so it stays in sync with the interpreter.
:::

See [Types & no-null](/guide/types) for how `Option` and `Result` (returned by `get`, `parse_int`,
and `recv`) are consumed, and [Collections](/guide/tour#collections) for lists, tuples, and strings.
