# Type II expansion and the remaining circularity

For a fixed even target `N`, let

\[
G(N)=\sum_{p\le N/2}1_{\mathbb P}(N-p),
\]

where the outer variable is prime.  Positivity of `G(N)` is the binary
Goldbach statement after the harmless symmetry reduction.

Applying a von Mangoldt/Vaughan decomposition to the inner prime indicator
does not turn this into a one-variable prime-counting problem.  A divisor
piece has the form

\[
 \sum_{d\le D} c_d\,
   \#\{p\le N/2:p\in\mathbb P, p\equiv N\pmod d\},
\]

which is Type I information about primes in arithmetic progressions.  The
remaining bilinear pieces have the form

\[
 \sum_{u\sim U}\sum_{v\sim V}
      \alpha_u\beta_v,1_{\mathbb P}(N-uv),
\]

or the corresponding expression with a prime variable and a divisor
variable.  To obtain a positive main term for `G(N)`, one must control these
terms with the sign and precision of the prime-supported correlation, for each
fixed `N`.  If `1_P(N-uv)` is relaxed to an almost-prime indicator, the usual
weighted-sieve estimates apply, but the resulting statement is Chen's
`p + P_2` theorem rather than Goldbach.

This is not merely a limitation of one decomposition.  A finite divisor
pattern cannot distinguish a prime from a rough composite (see
`FiniteLocal.lean` and `finite-modulus-obstruction.md`).  Extending the divisor
range until the exact support is recovered requires all divisors up to the
square root, and evaluating the resulting signed inclusion-exclusion is
equivalent to the original primality test.  Therefore a successful Type II
route must supply genuinely new parity-sensitive information about
`1_P(N-uv)`; the Type I estimates alone cannot close the proof.

Ford--Maynard's framework makes the logical requirement explicit: Type I and
Type II ranges are hypotheses, and a non-trivial prime lower bound is
guaranteed only in parameter regions where their optimal lower constant is
positive.  Their paper also constructs sequences obeying weaker ranges with
no primes, so the words “Type II” do not by themselves imply a Goldbach
lower bound.  See <https://arxiv.org/abs/2407.14368>, especially the abstract
and Sections 1--2.

This note is an exact reduction and obstruction analysis, not a proof of any
new Type II estimate.  Such an estimate, if proved with the required uniformity
in `N`, would be a genuine resolution of the binary Goldbach problem.
