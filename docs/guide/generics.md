# Generics

Functions, enums, and structs can take **type parameters** in `[ ]`, letting one definition work
over many types.

## Generic functions

```weft
fn map[T, U](xs: List[T], f: (T) -> U) -> List[U]:
    var out: List[U] = []
    for x in xs:
        out = push(out, f(x))
    out

fn fold[T, A](xs: List[T], init: A, step: (A, T) -> A) -> A:
    var acc = init
    for x in xs:
        acc = step(acc, x)
    acc

fn dbl(n: Int) -> Int:
    n * 2

fn add(a: Int, b: Int) -> Int:
    a + b

fn main() -> Unit:
    let nums = [1, 2, 3, 4]
    print(map(nums, dbl))       # [2, 4, 6, 8]
    print(fold(nums, 0, add))   # 10
```

Type arguments are **always inferred** from the call — you never write `map[Int, Int](...)`. If
the checker can't pin down a type parameter it reports `E0119`.

## Generic data types

```weft
struct Pair[A, B]:
    first: A
    second: B

fn swap[A, B](p: Pair[A, B]) -> Pair[B, A]:
    Pair(p.second, p.first)

fn main() -> Unit:
    let p = Pair(1, "one")
    let q = swap(p)             # Pair[Str, Int]
    print(q.first)             # one
    print(q.second)            # 1
```

Enums can be generic too:

```weft
enum Tree[T]:
    Leaf
    Node(Tree[T], T, Tree[T])

fn size[T](t: Tree[T]) -> Int:
    match t:
        Leaf          => 0
        Node(l, _, r) => size(l) + 1 + size(r)

fn main() -> Unit:
    let t: Tree[Int] = Node(Node(Leaf, 1, Leaf), 2, Leaf)
    print(size(t))
```

## What "parametric" means

Weft's generics are **fully parametric** — there are no bounds or trait constraints. Inside a
generic body a type parameter `T` is **opaque**: you can pass it around, store it, put it in a
list, match on it, and send it over a channel, but you cannot add, compare, or call it, because the
checker knows nothing about what `T` supports.

```weft noplay
fn bad[T](a: T, b: T) -> Bool:
    a == b        # error: T is opaque — nothing says it's comparable
```

Generics are **erased**: a generic definition compiles to a *single* function or descriptor, not
one copy per type. This keeps the compiled program small and is why type arguments never need to be
written down.

A generic function is **call-only** — it isn't a first-class value (`E0136`). If you need one as a
value, wrap it in a lambda with concrete types.
