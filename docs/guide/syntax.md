# Syntax

Tantu's surface is small and regular. This page is the reference for the shape of the language.

## Layout: indentation, not braces

Blocks are introduced by a `:` and an increase in indentation, exactly like Python. Indentation is
**spaces only** — a tab in indentation is a lexer error (`L001`). A block's body must be more
indented than its header and consistently so.

```tantu
fn main() -> Unit:
    if true:
        print("indented one level")
        print("still in the block")
    print("back out")
```

## Comments

Line comments start with `#` and run to end of line. There are no block comments.

```tantu
fn main() -> Unit:
    # this is a comment
    print("hi")   # trailing comment
```

## Identifiers and keywords

Identifiers are `[A-Za-z_][A-Za-z0-9_]*`. Type and constructor names conventionally start with an
uppercase letter. The reserved keywords are:

```
fn let var if elif else while for in loop break continue return
match enum struct spawn select import and or not true false
```

## Literals and primitive types

| Type | Literals |
|------|----------|
| `Int` | `0`, `42`, `1_000` (underscores allowed) |
| `Float` | `3.14`, `1_000.5` |
| `Bool` | `true`, `false` |
| `Str` | `"hello"`, with escapes like `\n`, `\t`, `\"`, `\\` |
| `Unit` | `()` |

```tantu
fn main() -> Unit:
    let big = 1_000_000
    let pi = 3.14159
    let ok = true
    print(big)
    print(pi)
    print(ok)
```

## Operators

| Group | Operators |
|-------|-----------|
| Arithmetic | `+` `-` `*` `/` `%` (integer `/` is floor division) |
| Comparison | `==` `!=` `<` `<=` `>` `>=` |
| Logical | `and` `or` `not` |
| Other | `?` (error propagation), `.` (field/module access), `->`/`=>` (types/match arms) |

`==`/`!=` work on every type except functions and channels. Ordering (`<` `<=` `>` `>=`) is defined
for `Int`, `Float`, and `Str`. Both operands of a binary operator must have the **same** type —
there is no implicit `Int`→`Float` widening (use `float(n)`).

```tantu
fn main() -> Unit:
    print(17 / 5)          # 3  (floor division)
    print(17 % 5)          # 2
    print(float(17) / float(5))   # a Float division would need Float operands
    print(1 < 2 and 3 >= 3)
```

## The grammar

The parser follows a fixed EBNF grammar (DESIGN §2.11 in the language repo). The pages that follow
cover each construct — [functions](/guide/functions), [pattern matching](/guide/pattern-matching),
[types](/guide/types), [concurrency](/guide/concurrency), [modules](/guide/modules), and
[generics](/guide/generics) — with runnable examples.
