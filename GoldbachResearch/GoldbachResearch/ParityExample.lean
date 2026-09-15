import GoldbachResearch.Basic

namespace GoldbachResearch

def roughCandidates (n z : Nat) : List Nat :=
  (List.range (n / 2 + 1)).filter fun p =>
    isPrime p && decide (2 <= n - p) &&
      ((List.range (z + 1)).all fun d =>
        decide (d < 2) || decide ((n - p) % d != 0))

def primeRoughCandidates (n z : Nat) : List Nat :=
  (roughCandidates n z).filter fun p => isPrime (n - p)

def roughPrimeCount (n z : Nat) : Nat :=
  (primeRoughCandidates n z).length

theorem cube_root_cutoff_68 : 4 ^ 3 <= 68 /\ 68 < (4 + 1) ^ 3 := by
  decide

theorem roughCandidates_68_4 :
    roughCandidates 68 4 = [3, 7, 13, 19, 31] := by
  decide

theorem primeRoughCandidates_68_4 :
    primeRoughCandidates 68 4 = [7, 31] := by
  decide

theorem roughPrimeCount_68_4 : roughPrimeCount 68 4 = 2 := by
  decide

theorem rough_prime_majority_fails_at_68 :
    Not ((roughCandidates 68 4).length <= 2 * roughPrimeCount 68 4) := by
  decide

theorem rough_composite_complements_68 :
    (68 - 3 = 5 * 13) /\ (68 - 13 = 5 * 11) /\ (68 - 19 = 7 * 7) := by
  decide

theorem rough_complements_68_prime_checks :
    isPrime 65 = false /\ isPrime 61 = true /\ isPrime 55 = false /\
      isPrime 49 = false /\ isPrime 37 = true := by
  decide

theorem goldbach_68_from_7 : Goldbach 68 := by
  refine Exists.intro 7 (Exists.intro 61 ?_)
  exact And.intro ((isPrime_eq_true_iff 7).mp (by decide))
    (And.intro ((isPrime_eq_true_iff 61).mp (by decide)) (by decide))

theorem goldbach_68_from_31 : Goldbach 68 := by
  refine Exists.intro 31 (Exists.intro 37 ?_)
  exact And.intro ((isPrime_eq_true_iff 31).mp (by decide))
    (And.intro ((isPrime_eq_true_iff 37).mp (by decide)) (by decide))

end GoldbachResearch
