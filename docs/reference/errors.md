# Error-code reference

Every diagnostic Weft reports carries a stable code. The prefix tells you which stage produced it:

| Prefix | Stage | When |
|--------|-------|------|
| `L###` | lex | tokenizing the source (indentation, characters, string literals) |
| `P###` | parse | building the syntax tree |
| `E####` | check | type checking (types, scopes, exhaustiveness, no-null, immutability) |
| `R###` | runtime | a panic while the program runs |

Lex, parse, and check errors are **compile-time** (exit code 2) — the program never runs. Runtime
panics (exit code 1) happen during execution and terminate the whole program with a stack trace.

<!--@include: ./_errors.generated.md-->

::: info Generated
The code list is pulled directly from the interpreter's error registry (`weft/errors.py`), so a new
code can't silently go undocumented.
:::

Many of these are explained in context: immutability and no-null (`E0102`, `E0103`, `E0106`,
`E0107`) in [Types & no-null](/guide/types), exhaustiveness (`E0105`, `E0120`) in
[Pattern matching](/guide/pattern-matching), closures (`E0103`) in
[Functions & closures](/guide/functions), generics (`E0119`, `E0136`) in [Generics](/guide/generics),
and imports (`E0130`–`E0134`) in [Modules](/guide/modules).
