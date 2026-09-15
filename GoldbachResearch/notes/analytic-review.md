# Analytic review and a rigorous diagnostic

Status: this note does **not** prove binary Goldbach. The deletion proposition
below has a complete ordinary mathematical proof; it has not been formalized
in Lean. The circle-method statement is explicitly conditional. No assertion
of novelty is made for the diagnostic construction.

Write \(\mathcal P\) for the primes, \(\pi(x)=|\mathcal P\cap[1,x]|\), and
\(\log\) for the natural logarithm.

## A density-one prime subset can miss infinitely many even sums

**Proposition.** There exists \(A\subseteq\mathcal P\) such that:

1. \(\pi(x)-|A\cap[1,x]|=O(x/\log^2 x)\). In particular,
   \(|A\cap[1,x]|\sim\pi(x)\sim x/\log x\).
2. For every fixed integer \(q\geq1\) and every integer \(a\) with
   \(\gcd(a,q)=1\),
   \[
   |\{p\in A:p\leq x,\ p\equiv a\pmod q\}|
      \sim\frac{x}{\varphi(q)\log x}.
   \]
3. Infinitely many distinct even integers are absent from
   \(A+A=\{p+q:p,q\in A\}\), with repeated summands allowed.

**Proof.** Define the ordered representation count
\[
r(n)=|\{(p,q)\in\mathcal P^2:p+q=n\}|.
\]
An elementary prime-counting upper bound supplies an absolute constant
\(B>0\) for which
\[
\pi(2X)\leq B X/\log X\qquad(X\geq8).
\]
The prime number theorem also supplies this bound, after enlarging \(B\)
over a bounded initial range. We use the prime number theorem only for the
asymptotic conclusions at the end.

For each integer \(j\geq1\), set \(X_j=8^j\). There are at least \(X_j/2\)
even integers in \([X_j,2X_j]\). Since every ordered pair contributing to
any of their representation counts is a pair of primes at most \(2X_j\),
\[
\sum_{\substack{X_j\leq n\leq2X_j\\2\mid n}}r(n)
   \leq\pi(2X_j)^2.
\]
Consequently, one can choose an even \(N_j\in[X_j,2X_j]\) such that
\[
r(N_j)\leq \frac{2\pi(2X_j)^2}{X_j}
          \leq C\frac{X_j}{\log^2 X_j},\qquad C=2B^2.
\]
For definiteness, choose the least even integer attaining the minimum
representation count in that interval. This is a finite choice that does
not assume that the count is positive.

From every representation of \(N_j\), delete its larger prime summand:
\[
D_j=\{\max(p,q):p,q\in\mathcal P,\ p+q=N_j\}.
\]
In particular, if \(p=q\), that prime is deleted as well. We have
\[
D_j\subseteq[X_j/2,2X_j],\qquad
|D_j|\leq r(N_j)\leq C X_j/\log^2 X_j.
\]
Let \(D=\bigcup_{j\geq1}D_j\) and \(A=\mathcal P\setminus D\).
Every representation of \(N_j\) by two primes loses at least one of its
summands. Therefore \(N_j\notin A+A\). The intervals \([X_j,2X_j]\) are
disjoint, so these are infinitely many distinct exceptions.

It remains to check the deletion bound at **all** real values of \(x\),
including between the chosen scales. Put
\(t_i=X_i/\log^2 X_i=8^i/(i^2\log^2 8)\). Then
\[
\frac{t_i}{t_{i+1}}=\frac{1}{8}\left(\frac{i+1}{i}\right)^2
   \leq\frac12\qquad(i\geq1),
\]
and hence \(\sum_{i=1}^j t_i\leq2t_j\).
For any \(x\geq4\), choose the unique \(j\geq1\) such that
\[
X_j/2\leq x<X_{j+1}/2=4X_j.
\]
All \(D_i\) with \(i>j\) lie above \(x\), so
\[
|D\cap[1,x]|\leq\sum_{i=1}^j|D_i|
 \leq2C\frac{X_j}{\log^2 X_j}
 =O\left(\frac{x}{\log^2 x}\right).
\]
The last comparison has an absolute constant: \(X_j\leq2x\), and
\(\log x\leq\log X_j+\log4\leq(5/3)\log X_j\) since \(X_j\geq8\).
Thus the estimate is uniform in \(x\), not merely a bound on a subsequence.

Subtracting this deletion bound from the prime number theorem proves (1).
For any fixed reduced residue class modulo \(q\), its deleted count is
at most \(|D\cap[1,x]|=O(x/\log^2 x)=o(x/\log x)\).
Subtract this from the prime number theorem in that fixed arithmetic
progression to obtain (2). This proves the proposition.

The two standard prime number theorems used here are covered in
[Tao's analytic number theory notes](https://terrytao.wordpress.com/2014/12/09/254a-notes-2-complex-analytic-multiplicative-number-theory/),
including the fixed-modulus progression theorem in Exercise 50.

**Finite initial data can also be preserved.** For any prescribed real
cutoff \(H>0\), start the construction at an index \(j_0\) with
\(X_{j_0}/2>H\). All the same estimates hold, and no prime at most \(H\)
is deleted. Thus adding any prescribed finite range of exact prime data
to the leading asymptotics does not repair the universal implication
disproved by this proposition.

**Scope of the diagnostic.** This is a counterexample to the universal
claim that relative density one inside the primes, even together with
all fixed-progression leading asymptotics, forces every sufficiently
large even integer into a set's two-fold sumset. It is not a counterexample
to Goldbach, since \(A\) is an artificially selected subset of the primes.
It does not rule out a proof using additional arithmetic structure of the
full prime set. It does not assert preservation of sharp error terms,
uniformity for growing moduli, or sufficiently short interval estimates.
The deletion argument uses no Goldbach lower bound and remains valid
whether or not Goldbach itself is true.

## Exact conditional circle-method reduction

For an integer \(N\geq4\), define \(e(t)=\exp(2\pi i t)\) and the
prime-only weighted sum
\[
S_N(\alpha)=\sum_{\substack{p\leq N\\p\in\mathcal P}}
              (\log p)e(p\alpha).
\]
Expanding the finite square and using
\(\int_0^1e(k\alpha)\,d\alpha=1\) for \(k=0\), and zero for nonzero
integer \(k\), gives the exact identity
\[
R(N):=\sum_{\substack{p+q=N\\p,q\in\mathcal P}}
          (\log p)(\log q)
     =\int_0^1 S_N(\alpha)^2e(-N\alpha)\,d\alpha.
\]
Every summand in the left side is strictly positive. Thus
\(R(N)>0\) if and only if \(N\) is a sum of two primes.

**Conditional theorem.** Suppose there are an explicit integer
\(N_0\geq4\) and a real constant \(c>0\) such that, for every even integer
\(N\geq N_0\), there is a measurable set \(\mathfrak M_N\subseteq[0,1]\)
with complement \(\mathfrak m_N\) satisfying both
\[
\operatorname{Re}\int_{\mathfrak M_N}
       S_N(\alpha)^2e(-N\alpha)\,d\alpha\geq cN
\]
and
\[
\left|\int_{\mathfrak m_N}
       S_N(\alpha)^2e(-N\alpha)\,d\alpha\right|<cN.
\]
If every even \(N\) with \(4\leq N<N_0\) is separately verified, binary
Goldbach follows.

**Proof.** The total integral is real and equals \(R(N)\). Its real part
is greater than \(cN-cN=0\), by the two hypotheses. Use the finite
verification below \(N_0\).

This reduction does not establish either uniform estimate. The missing
pointwise signed minor-arc estimate cannot be silently replaced by an
average over target integers. A statement valid for all sufficiently
large \(N\) with an unknown threshold also does not connect automatically
to any specified finite computation.

The available direct triangle/Parseval estimate is only
\[
\left|\int_{\mathfrak m_N}S_N(\alpha)^2e(-N\alpha)\,d\alpha\right|
\leq\int_0^1|S_N(\alpha)|^2\,d\alpha
=\sum_{p\leq N}(\log p)^2=O(N\log N).
\]
This upper bound is too large to imply the required \(cN\) bound. That
observation is a limitation of this estimate, not a proof that no improved
argument can work. See
[Tao's discussion of circle-method limitations](https://terrytao.wordpress.com/2012/05/20/heuristic-limitations-of-the-circle-method/).
Its general discussion explicitly includes heuristic conclusions.

## Two algebraic mistakes to exclude

Replacing \(S_N^2\) by \(|S_N|^2\) changes sums of primes into differences
of primes. In fact
\(\int_0^1|S_N(\alpha)|^2e(-N\alpha)\,d\alpha=0\), since no primes
\(p,q\leq N\) have \(p-q=N\). Positivity of a norm therefore supplies
no proof that the Goldbach coefficient is positive.

If instead one uses the von Mangoldt function \(\Lambda\), then
\[
R_\Lambda(N)=\sum_{m=1}^{N-1}\Lambda(m)\Lambda(N-m)>0
\]
alone only supplies two prime powers. For example, the summand for
\(18=9+9\) is positive although both displayed summands are composite.
A sufficient explicit correction is
\[
R_\Lambda(N)>\frac{2\sqrt N(\log N)^3}{\log2}.
\]
Indeed, the number of proper prime powers at most \(N\) is at most
\(\sqrt N\log_2 N\): their exponents range from 2 to
\(\lfloor\log_2 N\rfloor\), and each exponent has at most \(\sqrt N\)
possible bases. Ordered pairs with at least one proper prime power number
at most twice that amount. Each has weight at most \((\log N)^2\), so
\[
0\leq R_\Lambda(N)-R(N)
\leq\frac{2\sqrt N(\log N)^3}{\log2}.
\]
The displayed strict lower bound then forces \(R(N)>0\). No such uniform
lower bound for every even \(N\) is proved in this project.

## Status and external context

An [AMS article dated 2026-02-01](https://mathvoices.ams.org/featurecolumn/2026/02/01/does-mathematics-progress/)
states that the binary conjecture has no known general proof.
[Helfgott's theorem](https://arxiv.org/abs/1501.05438) concerns every odd
integer greater than five as a sum of three primes; it does not supply
the missing binary estimate. The
[published verification by Oliveira e Silva, Herzog, and Pardi](https://www.ams.org/mcom/2014-83-288/S0025-5718-2013-02787-1/S0025-5718-2013-02787-1.pdf)
reports verification of the even conjecture through \(4\cdot10^{18}\).
That published computation is external context, not a theorem rechecked
by this Lean project.
