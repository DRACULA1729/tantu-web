# Language tour

A guided walk through Tantu. Every block runs: hit **Try it ** and change things.

## Values and bindings

```tantu
fn main() -> Unit:
    let name = "Ada"        # immutable
    var count = 0           # mutable
    count = count + 1
    print(name)
    print(count)
```

`let` is immutable and is what you should reach for; `var` opts into mutation. Tantu has the
primitive types `Int`, `Float`, `Bool`, `Str`, and `Unit` (the empty value `()`).

## Functions

```tantu
fn add(a: Int, b: Int) -> Int:
    a + b                   # the last expression is the return value

fn main() -> Unit:
    print(add(2, 3))
    let double = fn(x: Int) -> Int: x * 2   # a lambda
    print(double(21))
```

The last expression in a body is its result, with no `return` needed (though `return` works for early
exits). Functions are ordinary values with a type like `(Int) -> Int`.

## Control flow is expression-oriented

```tantu
fn main() -> Unit:
    let score = 85
    let grade = if score >= 90: "A" elif score >= 80: "B" else: "C"
    print(grade)

    var n = 3
    while n > 0:
        print(n)
        n = n - 1
```

An `if` used as an expression must have an `else`, and all branches must share a type. Loops
(`while`, `for`, `loop`) are statements.

## Enums, structs, and pattern matching

```tantu
enum Color:
    Red
    Green
    Custom(Int, Int, Int)

fn describe(c: Color) -> Str:
    match c:
        Red             => "red"
        Green           => "green"
        Custom(r, _, _) => "custom, r=" + str(r)

fn main() -> Unit:
    print(describe(Green))
    print(describe(Custom(200, 30, 40)))
```

`match` is exhaustive: the checker rejects a match that forgets a variant. It is also an
expression, so it produces a value.

## No null: Option and Result

```tantu
fn find(id: Int) -> Option[Str]:
    if id == 1:
        return Some("ada")
    return None

fn main() -> Unit:
    match find(1):
        Some(name) => print(name)
        None       => print("not found")
```

There is no `null` in Tantu. Absence is `Option[T]`; recoverable failure is `Result[T, E]`. You get
the value out by matching, or with the `?` operator; see [Types & no-null](/guide/types).

## Collections

```tantu
fn main() -> Unit:
    let xs = [1, 2, 3]
    let ys = push(xs, 4)        # a NEW list; xs is unchanged
    print(ys)
    print(len(ys))
    let pair = (1, "one")       # a tuple
    let (num, word) = pair      # destructuring
    print(word)
```

Lists are immutable by convention: `push` and `concat` return new lists. Tuples always have at
least two elements.

## Concurrency

```tantu
fn worker(jobs: Chan[Int], out: Chan[Int]) -> Unit:
    loop:
        match recv(jobs):
            Some(n) => send(out, n * n)
            None    => break

fn main() -> Unit:
    let jobs = chan[Int](8)
    let out = chan[Int](8)
    spawn worker(jobs, out)
    var i = 1
    while i <= 4:
        send(jobs, i)
        i = i + 1
    close(jobs)
    var got = 0
    while got < 4:
        match recv(out):
            Some(v) => print(v)
            None    => break
        got = got + 1
```

`spawn` starts a fiber; fibers talk over typed channels rather than sharing memory. `recv` returns
`Option[T]`, so a closed-and-drained channel yields `None`. More in
[Concurrency](/guide/concurrency).

## Generics

```tantu
fn map[T, U](xs: List[T], f: (T) -> U) -> List[U]:
    var out: List[U] = []
    for x in xs:
        out = push(out, f(x))
    out

fn dbl(n: Int) -> Int:
    n * 2

fn main() -> Unit:
    print(map([1, 2, 3], dbl))
```

Type parameters go in `[ ]`. Generics are fully parametric and inferred; you never write the type
arguments. See [Generics](/guide/generics).

That is the whole language in one page. The rest of the guide goes deeper on each topic.
