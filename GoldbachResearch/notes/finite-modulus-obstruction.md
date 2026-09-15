# Finite-modulus obstruction to an algebraic proof

Let m be at least 1, let \(U_m=(\mathbb Z/m\mathbb Z)^\times\), and define the
local unit-pair count

\[
 c_m(N)=\#\{a\pmod m:a\in U_m, N-a\in U_m\}.
\]

This is the convolution seen by any argument that retains only residue
classes modulo one fixed modulus.  It has no obstruction beyond parity.

## Local surjectivity

For every even integer N, \(c_m(N)>0\).  More generally, if m is odd then
\(c_m(N)>0\) for every N.

To check a prime power \(p^e\mid m\), first take p = 2.  The units modulo
\(2^e\) are the odd classes, so an even N makes \(N-a\) odd for every
odd a.  If p is odd, choose a class a modulo p outside the at most two
forbidden classes 0 and N modulo p.  Such a class exists because p is at
least 3.  Any lift of a modulo \(p^e\) is a unit, and so is \(N-a\), since
neither is divisible by p.  The Chinese remainder theorem combines these
choices for all prime powers dividing m.

Consequently, a finite-field or fixed-modulus polynomial argument cannot
derive a contradiction from local congruence conditions: every even target
passes them.

Residues also cannot certify primality.  Given any unit class a modulo m,
choose k so that \(a+km>1\) and set
\[
 A=(a+km)(1+m).
\]
Then A is composite and \(A\equiv a\pmod m\).  The same construction can be
done independently for a second unit class b.  Hence even a locally
admissible pair of residue classes has integer representatives that are both
composite; a finite list of congruence tests cannot replace a global
prime-value assertion.

## Exact count

The CRT also gives a product formula.  For \(p^e\Vert m\), the local factor is

\[
 c_{2^e}(N)=
 \begin{cases}2^{e-1},&N\equiv0\pmod2,\\0,&N\equiv1\pmod2,
 \end{cases}
\]

and, for odd p,

\[
 c_{p^e}(N)=
 \begin{cases}
 p^{e-1}(p-1),&p\mid N,\\
 p^{e-1}(p-2),&p\nmid N.
 \end{cases}
\]

Indeed, modulo p there are \(p-1\) admissible a when \(p\mid N\), and
\(p-2\) otherwise; each admissible residue has \(p^{e-1}\) lifts.  Thus

\[
 c_m(N)=\prod_{p^e\Vert m}c_{p^e}(N).
\]

The positive value of \(c_m(N)\) is only a local statement about units, not
about primality of integer representatives.  A proof of binary Goldbach must
add genuinely global information (for example, a pointwise prime-pair
estimate); finite quotient data alone cannot supply it.
