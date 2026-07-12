# Pattern matching

`match` is how you take data apart in Tantu. It is an **expression** (it produces a value) and it is
**exhaustive** (the checker makes you handle every case).

## Matching enums

```tantu
enum Signal:
    Stop
    Go
    Caution(Int)

fn advice(s: Signal) -> Str:
    match s:
        Stop       => "halt"
        Go         => "proceed"
        Caution(n) => "slow for " + str(n) + "s"

fn main() -> Unit:
    print(advice(Go))
    print(advice(Caution(5)))
```

## Kinds of pattern

- **Literal**: `0`, `-1`, `"hi"`, `true`
- **Binding**: `name` (captures the value)
- **Wildcard**: `_` (matches anything, binds nothing)
- **Variant**: `Some(x)`, `Caution(n)`, `Custom(r, g, b)`
- **Tuple**: `(a, b)`

Patterns nest, so you can destructure deeply in one arm:

```tantu
fn describe(p: (Int, Option[Str])) -> Str:
    match p:
        (0, None)       => "zero, nothing"
        (n, Some(name)) => str(n) + " for " + name
        (n, None)       => str(n) + ", nothing"

fn lookup(found: Bool) -> Option[Str]:
    if found:
        return Some("ada")
    return None

fn main() -> Unit:
    print(describe((0, lookup(false))))
    print(describe((7, lookup(true))))
```

## Exhaustiveness

The checker rejects a `match` that misses a case. This won't compile, since it forgets `Blue`:

```tantu noplay
enum Hue:
    Red
    Blue

fn name(h: Hue) -> Str:
    match h:
        Red => "red"      # error E0105: match on 'Hue' is not exhaustive; missing: Blue
```

A binding or wildcard arm covers "everything else", but once you write one, any arm after it is
**unreachable** (`E0120`). For `Int` and `Str` matches, which have unbounded value sets, a
trailing wildcard or binding arm is required.

```tantu
fn size(n: Int) -> Str:
    match n:
        0 => "none"
        1 => "one"
        _ => "many"

fn main() -> Unit:
    print(size(0))
    print(size(42))
```

## `match` as a value

Because `match` is an expression, all its arms must produce the same type, and you can use it
anywhere a value is expected:

```tantu
fn main() -> Unit:
    let x = 2
    let label = match x:
        1 => "one"
        2 => "two"
        _ => "other"
    print(label)
```

There are no guards, or-patterns, or struct patterns in v1; match a struct by binding it and
reading fields, and match a `Float` with a binding plus comparisons.
