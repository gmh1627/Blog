import GoldbachResearch.Reductions

namespace GoldbachResearch

def checkUpTo (bound : Nat) : Bool :=
  (List.range (bound + 1)).all fun n =>
    if 4 <= n /\ n % 2 = 0 then goldbachCheck n else true

theorem checkUpTo_eq_true_iff (bound : Nat) :
    checkUpTo bound = true <-> GoldbachUpTo bound := by
  unfold checkUpTo
  rw [List.all_eq_true]
  constructor
  · intro h n hn hbound heven
    have hc := h n (List.mem_range.mpr (by omega))
    simp only [hn, heven, and_self, ↓reduceIte] at hc
    exact (goldbachCheck_eq_true_iff n).mp hc
  · intro h n hmem
    have hbound : n <= bound := by
      have := List.mem_range.mp hmem
      omega
    by_cases hc : 4 <= n /\ n % 2 = 0
    · simp only [hc, ↓reduceIte]
      exact (goldbachCheck_eq_true_iff n).mpr (h n hc.1 hbound hc.2)
    · simp only [hc, ↓reduceIte]

set_option maxRecDepth 100000 in
set_option maxHeartbeats 2000000 in
theorem checkUpTo_1000 : checkUpTo 1000 = true := by
  decide +kernel

theorem goldbachUpTo_1000 : GoldbachUpTo 1000 :=
  (checkUpTo_eq_true_iff 1000).mp checkUpTo_1000

theorem counterexample_above_1000 {n : Nat} (hn : 4 <= n)
    (heven : n % 2 = 0) (hfailure : ¬ Goldbach n) : 1000 < n := by
  by_cases hbound : n <= 1000
  · exact False.elim (hfailure (goldbachUpTo_1000 n hn hbound heven))
  · omega

end GoldbachResearch
