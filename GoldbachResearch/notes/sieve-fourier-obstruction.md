# What a pointwise proof must add

For an even integer `N`, write

```
R(N) = #{ p <= N : p and N-p are prime }.
```

The Hardy--Littlewood prediction is

```
R(N) ~ 2*C2 * N/(log N)^2 * product_{r|N, r>2} (r-1)/(r-2),
```

whose main term is positive.  A binary proof therefore needs a pointwise
error estimate that is `o(N/(log N)^2)` for every even `N`.  Existing
circle-method arguments obtain this only after averaging over `N` (or for
almost all `N`); their minor-arc estimates are not uniform enough to imply
positivity for each individual target.

Replacing prime indicators by the von Mangoldt function removes logarithmic
weights but does not change the logical bottleneck: positivity of
`sum_n Lambda(n) Lambda(N-n)` is already a prime-pair correlation problem.
Prime powers contribute at most `O(sqrt N * (log N)^2)`, so controlling the
weighted sum pointwise would essentially prove Goldbach itself.

Combinatorial and Selberg sieves face the parity barrier.  Local congruence
data count integers with an even or odd number of prime factors equally well,
so a lower-bound sieve for the pair `(n, N-n)` cannot separate two primes from
a prime plus a semiprime.  Chen's theorem reaches `p + P_2`; eliminating the
second prime factor requires genuinely parity-sensitive input, currently
unavailable.  Any claimed complete proof must explicitly supply such a new
pointwise, parity-breaking estimate.
