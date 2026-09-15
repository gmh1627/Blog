import GoldbachResearch.Basic

namespace GoldbachResearch

def yunNonDivisorPrimes (n : Nat) : List Nat :=
  (List.range n).filter fun p => isPrime p && decide (n % p != 0)

def yunComplements (n : Nat) : List Nat :=
  (yunNonDivisorPrimes n).map (fun p => 2 * n - p)

def yunMultipleUnion (n : Nat) : List Nat :=
  (List.range (2 * n + 1)).filter fun b =>
    decide (n < b /\ b < 2 * n) &&
      (yunNonDivisorPrimes n).any (fun p => b % p == 0)

theorem yun_nondivisor_primes_10 :
    yunNonDivisorPrimes 10 = [3, 7] := by
  decide

theorem yun_complements_10 : yunComplements 10 = [17, 13] := by
  decide

theorem yun_multiple_union_10 :
    yunMultipleUnion 10 = [12, 14, 15, 18] := by
  decide

theorem yun_claimed_strict_cardinality_fails_at_10 :
    ¬ (yunMultipleUnion 10).length < (yunComplements 10).length := by
  decide

theorem strict_subset_does_not_reverse_membership :
    44 ∉ (List.range 61).filter (fun b =>
      decide (30 < b /\ b < 60) &&
        ([7].any (fun p => b % p == 0))) /\
    44 ∈ (List.range 61).filter (fun b =>
      decide (30 < b /\ b < 60) &&
        ([7, 11].any (fun p => b % p == 0))) := by
  decide

end GoldbachResearch
