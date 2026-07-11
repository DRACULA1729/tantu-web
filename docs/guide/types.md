# Types & no-null

Tantu is statically typed, and it has **no `null`**. This page covers how types work and how Tantu
models "no value" and "failure" as ordinary data.

## The inference boundary

You annotate **signatures**; Tantu infers **bodies**. Function parameter types and non-`Unit` return
types are required; local `let`/`var` types are usually inferred from the initializer.

```tantu
fn twice(x: Int) -> Int:     # signature: annotated
    let y = x + x            # body: y is inferred as Int
    y

fn main() -> Unit:
    print(twice(21))
```

Add an annotation to a local when the type can't be inferred — most commonly an empty list:

```tantu
fn main() -> Unit:
    let empty: List[Int] = []   # without the annotation this is E0107
    print(len(empty))
```

## Immutability

`let` bindings can't be reassigned; `var` bindings can. Assigning to a `let` is a compile error
(`E0102`).

```tantu noplay
fn main() -> Unit:
    let x = 1
    x = 2          # error E0102: cannot assign to immutable binding 'x'
```

Lists are immutable *by convention*: the builtins that "change" a list (`push`, `concat`) return a
new one and leave the original alone.

## No null: `Option[T]`

Absence is a value of type `Option[T]` — either `Some(value)` or `None`. There is no way to get a
"null pointer": the type system forces you to handle the `None` case.

```tantu
fn first_even(xs: List[Int]) -> Option[Int]:
    for x in xs:
        if x % 2 == 0:
            return Some(x)
    None

fn main() -> Unit:
    match first_even([1, 3, 4, 7]):
        Some(n) => print(n)
        None    => print("none found")
```

## Recoverable failure: `Result[T, E]`

`Result[T, E]` is `Ok(value)` or `Err(error)`. Use it when a caller might want to know *why*
something failed.

```tantu
fn parse_num(s: Str) -> Result[Int, Str]:
    match parse_int(s):
        Some(n) => Ok(n)
        None    => Err("not a number: " + s)

fn main() -> Unit:
    match parse_num("42"):
        Ok(n)  => print(n)
        Err(e) => print(e)
```

## The `?` operator

`?` unwraps an `Option` or `Result`, and on `None`/`Err` it **early-returns** from the enclosing
function. It turns a chain of matches into a straight line.

```tantu
fn parse_pair(s: Str) -> Result[(Int, Int), Str]:
    let parts = split(s, ",")
    if len(parts) != 2:
        return Err("expected two fields: " + s)
    let a = parse_num(parts[0])?      # on Err(e), parse_pair returns Err(e) here
    let b = parse_num(parts[1])?
    Ok((a, b))

fn parse_num(s: Str) -> Result[Int, Str]:
    match parse_int(s):
        Some(n) => Ok(n)
        None    => Err("not a number: " + s)

fn main() -> Unit:
    match parse_pair("3,4"):
        Ok((a, b)) => print(a + b)
        Err(e)     => print(e)
```

The rule: `?` on a `Result` requires the enclosing function to return a `Result` with the same error
type; `?` on an `Option` requires it to return an `Option`. Mixing the two is a type error (`E0106`)
— convert explicitly with `match`.

## Panics

The failure mode that *isn't* a value is a **panic**: division by zero, an out-of-range list index,
a `send` on a closed channel, or deadlock. A panic prints a stack trace and terminates the whole
program with exit code 1 — there is no `catch` in v1. Prefer `get` (which returns `Option`) over
indexing when an index might be out of range.
