# Functions & closures

## Declaring functions

```tantu
fn add(a: Int, b: Int) -> Int:
    a + b

fn log(msg: Str):            # no return type means -> Unit
    print("[log] " + msg)

fn main() -> Unit:
    print(add(2, 3))
    log("started")
```

Parameter types and non-`Unit` return types are required. The **last expression** of the body is
the return value; `return expr` is available for early exits, and a bare `return` returns `()`.

## Order doesn't matter

Module-level functions may call each other regardless of the order they're written — Tantu checks
all signatures first, then the bodies. Recursion and mutual recursion just work.

```tantu
fn is_even(n: Int) -> Bool:
    if n == 0:
        true
    else:
        is_odd(n - 1)

fn is_odd(n: Int) -> Bool:
    if n == 0:
        false
    else:
        is_even(n - 1)

fn main() -> Unit:
    print(is_even(10))
    print(is_odd(7))
```

## Functions are values

A function has a type like `(Int, Int) -> Int` and can be passed, stored, and returned.

```tantu
fn apply(f: (Int) -> Int, x: Int) -> Int:
    f(x)

fn inc(n: Int) -> Int:
    n + 1

fn main() -> Unit:
    print(apply(inc, 41))
```

## Lambdas and closures

Anonymous functions use `fn` with no name — an inline expression body, or an indented block:

```tantu
fn main() -> Unit:
    let double = fn(x: Int) -> Int: x * 2
    let clamp = fn(x: Int) -> Int:
        if x < 0:
            0
        else:
            x
    print(double(21))
    print(clamp(-5))
```

A closure captures the `let` bindings it references from the enclosing scope, **by value**:

```tantu
fn adder(n: Int) -> (Int) -> Int:
    fn(x: Int) -> Int: x + n     # captures n

fn main() -> Unit:
    let add10 = adder(10)
    print(add10(5))
```

## Why capture is by value

You can only capture immutable (`let`) bindings. Capturing a `var` is a compile error (`E0103`):
this is deliberate — it removes a whole class of data races between fibers and makes closures easy
to reason about. If you need a mutable value's current contents in a closure, copy it into a `let`
first.

```tantu noplay
fn main() -> Unit:
    var count = 0
    let show = fn() -> Int: count   # error E0103: cannot capture mutable binding 'count'
    print(show())
```
