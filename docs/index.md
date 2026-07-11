---
layout: home

hero:
  name: Tantu
  text: A small language with big ideas
  tagline: Python-readable syntax, static types with no null, and Go-style concurrency — compiled to bytecode and run on a hand-built stack VM.
  actions:
    - theme: brand
      text: Get started
      link: /guide/quick-start
    - theme: alt
      text: Open the playground
      link: /play/
      target: _blank
      rel: noopener
    - theme: alt
      text: Language tour
      link: /guide/tour

features:
  - title: Readable by design
    details: Indentation-based blocks and a familiar, expression-oriented syntax. If you can read Python, you can read Tantu.
  - title: No null, no surprises
    details: Absence and failure are values — Option[T] and Result[T, E] — unwrapped by match or the ? operator. The type checker has your back.
  - title: Concurrency without shared state
    details: Lightweight fibers pass messages over typed channels (CSP). select waits on many at once. Deterministic and testable.
  - title: Nothing hidden
    details: A real pipeline — lexer → parser → checker → compiler → linker → stack VM — that you can inspect end to end in the playground.
---

## Tantu in thirty seconds

```tantu
enum Shape:
    Circle(Float)
    Rect(Float, Float)

fn area(s: Shape) -> Float:
    match s:
        Circle(r)  => 3.14159 * r * r
        Rect(w, h) => w * h

fn main() -> Unit:
    print(area(Circle(2.0)))
    print(area(Rect(3.0, 4.0)))
```

Hover any code block and hit **Try it ▶** to run it in the [playground](/play/){target="_blank" rel="noopener"} —
the real interpreter, running in your browser. No install required.
