# Weighted sieve reduction for a hypothetical counterexample

Let `N` be even and suppose it has no representation as two primes.  For
each prime `p <= N/2`, the complementary odd integer `N-p` is composite and
has a prime divisor `ell <= sqrt(N)`.  Consequently every such `p` lies in a
residue class

```
p = N (mod ell),   ell <= sqrt(N).
```

Thus a counterexample would give a complete covering of the primes up to
`N/2` by these small-prime residue classes.  Sieve heuristics predict an
uncovered set of order `N/(log N)^2`, but proving that this set is nonempty
is the binary-prime problem itself.

The exact prime-divisor identity is

```
Lambda(m) = -sum_{d|m} mu(d) log d.
```

Its signs alternate with the parity of the number of prime factors.  A
truncation in `d` leaves a remainder from large divisors, while replacing
`mu` by `|mu|` destroys cancellation and yields only an upper-bound sieve.
Therefore no positive lower-bound weight for both `p` and `N-p` follows from
the available local congruence data.  Producing one pointwise would break the
classical sieve parity barrier and, via the covering formulation above,
settle the strong Goldbach conjecture.
