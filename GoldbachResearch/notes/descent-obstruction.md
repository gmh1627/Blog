# Minimal-counterexample descent: what it actually gives

Assume, for contradiction, that `N` is the least even integer `>= 4` that is
not a sum of two primes.  The only immediate consequence is

```
for every prime p < N, the integer N - p is composite.
```

Indeed, `N-p` is odd and positive, and a prime value would be a Goldbach
representation of `N`.  Minimality also says that every representation
`N-2 = p+q` is blocked after shifting by two: at least one of `p+2` and
`q+2` is composite.  This is a restriction on prime pairs, not a way to
construct a representation of `N-2` with a smaller parameter.  Iterating the
same observation gives analogous conditions for `N-2k`, but no descent: the
shifted summands need not remain prime.

The often-used interpolation step is not a valid consequence of additive
representations.  For the odd set

```
S = {1, 3, 5},   N = 12,
```

all smaller even values are represented (`4=1+3`, `6=3+3`, `8=3+5`,
`10=5+5`), while `12` is not: its complement pairs are `(1,11)`, `(3,9)`
and `(5,7)`, and none lies in `S x S`.  Thus represented endpoints (or all
smaller values) do not force the next even value.  Any proof using this step
would need an additional theorem about actual primes, of strength comparable
to the conjecture itself.

Even requiring the available summands to be genuine primes does not make the
logical interpolation valid.  In the finite prime subset
`S = {3, 7, 13, 19}`, the endpoint values `10 = 3+7` and `14 = 7+7` are
represented, while `12` has no representation from `S`.  Information that
only records existing endpoint pairs therefore cannot imply a pair at the
intermediate target; one must use a separate distribution theorem about all
primes.

Likewise, if `N-p = ab` with `a,b` prime (the Chen-type conclusion), replacing
`ab` by either factor does not preserve the equation as a sum of two primes;
it only produces `N = p + ab`.  Turning this into a binary representation
requires a new prime-value assertion for a shifted variable, and is exactly
where parity-barrier arguments stop.
