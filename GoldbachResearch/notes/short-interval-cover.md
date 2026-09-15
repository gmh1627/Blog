# Short-interval factor covering

This is a precise test of whether a short-interval prime-gap theorem can
close the factor-covering reduction.

Let `N` be an even counterexample and choose an interval

\[
 I=[N/2-H,N/2]
\]

with `H=N^(1/2+epsilon)`, where the available short-interval prime theorem
would guarantee roughly `H/log N` primes in `I`.  For every prime `p` in `I`,
the complement `N-p` is composite.  The small-factor theorem in the Lean
project gives a prime `ell` with

\[
 \ell\mid N-p,
 \qquad \ell^2\le N-p\le N,
\]

so `p` belongs to one of the residue classes

\[
 p\equiv N\pmod\ell,
 \qquad \ell\le\sqrt N.
\]

Because `H>sqrt(N)` for every fixed positive `epsilon`, each such modulus is
shorter than the interval.  A Brun--Titchmarsh estimate for a single class,
when the class is coprime to `ell`, has the shape

\[
 \#\{p\in I:p\text{ prime}, p\equiv N\pmod\ell\}
 \ll {H\over\varphi(\ell)\log(H/\ell)}.
\]

Summing this over prime `ell <= sqrt(N)` gives at best

\[
 \ll {H\over\log N}\sum_{\ell\le\sqrt N}{1\over\ell-1}
 =O\!\left({H\log\log N\over\log N}\right).
\]

The prime lower bound in `I` is only of order `H/log N`, so the union bound
is too large by a factor of order `log log N`.  Treating overlaps between the
classes is exactly a lower-bound sieve problem.  Replacing the union bound by
an inclusion--exclusion lower bound introduces alternating Mobius signs and
the parity obstruction recorded in `weighted-sieve-obstruction.md`.

Thus short-interval prime gaps do not by themselves give a contradiction.  A
successful version would need a new pointwise estimate that saves the entire
`log log N` factor while retaining prime support.  No such estimate is proved
here, and the analytic Brun--Titchmarsh and short-interval inputs have not been
formalized in Lean.

This calculation is a route audit, not an impossibility theorem for methods
that use additional global information.
