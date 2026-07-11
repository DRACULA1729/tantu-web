# Concurrency

Tantu's concurrency is **CSP** — the model behind Go. You start lightweight **fibers** with `spawn`,
and they communicate by passing messages over typed **channels** rather than sharing memory. There
is no shared mutable state to race on (closures capture by value, and you can't capture a `var`).

All fibers run cooperatively on one thread with a deterministic scheduler, so concurrent programs
produce the same output every time — which is why the examples below are runnable and testable.

## Channels

A channel carries values of one type. `chan[T](n)` makes one with a buffer of size `n`.

```tantu
fn main() -> Unit:
    let ch = chan[Int](2)
    send(ch, 1)
    send(ch, 2)
    match recv(ch):
        Some(v) => print(v)
        None    => print("closed")
    match recv(ch):
        Some(v) => print(v)
        None    => print("closed")
```

`send(ch, v)` puts a value on the channel; `recv(ch)` takes one and returns `Option[T]` — `Some(v)`
for a value, or `None` when the channel is closed and drained. That is why you always `match` a
`recv`.

## Spawning fibers

`spawn f(args)` runs `f` as a fiber. The classic pattern is a worker draining a jobs channel and
writing results to another:

```tantu
fn worker(jobs: Chan[Int], out: Chan[Int]) -> Unit:
    loop:
        match recv(jobs):
            Some(n) => send(out, n * n)
            None    => break        # jobs closed → stop

fn main() -> Unit:
    let jobs = chan[Int](8)
    let out = chan[Int](8)
    spawn worker(jobs, out)
    var i = 1
    while i <= 4:
        send(jobs, i)
        i = i + 1
    close(jobs)                     # tell the worker there's no more work
    var got = 0
    while got < 4:
        match recv(out):
            Some(v) => print(v)
            None    => break
        got = got + 1
```

`close(ch)` signals "no more values". Sending on a closed channel is a panic (`R003`); receiving
drains what's left and then yields `None`.

## `select`: wait on many channels

`select` waits on several channel operations at once and runs the first one that's ready. Arms are
polled in source order, so ties resolve deterministically. An `else` arm makes it non-blocking.

```tantu
fn main() -> Unit:
    let a = chan[Int](1)
    let b = chan[Int](1)
    send(a, 10)
    select:
        v = recv(a) =>
            match v:
                Some(n) => print(n)
                None    => print("a closed")
        v = recv(b) =>
            match v:
                Some(n) => print(n)
                None    => print("b closed")
```

## Timeouts

There's no timer arm in `select`; the idiom is to race your real work against a fiber that sleeps
and then signals on a timeout channel.

```tantu
fn timer(ms: Int, done: Chan[Int]) -> Unit:
    sleep(ms)
    send(done, 1)

fn main() -> Unit:
    let result = chan[Int](1)
    let timeout = chan[Int](1)
    spawn timer(50, timeout)
    # (nothing ever sends on `result`, so the timeout wins)
    select:
        v = recv(result) =>
            match v:
                Some(n) => print(n)
                None    => print("result closed")
        v = recv(timeout) =>
            print("timed out")
```

In the playground, `sleep` uses a virtual clock, so timeouts resolve instantly and deterministically
instead of actually waiting.
