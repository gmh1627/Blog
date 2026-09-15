import GoldbachResearch.Reductions

namespace GoldbachResearch

def representationCount (n : Nat) : Nat :=
  (List.range (n + 1)).countP (fun p => isPrime p && isPrime (n - p))

theorem representationCount_pos_iff (n : Nat) :
    0 < representationCount n <-> Goldbach n := by
  rw [goldbach_iff_reflection]
  simp only [representationCount, List.countP_pos_iff, List.mem_range,
    Bool.and_eq_true, isPrime_eq_true_iff]
  constructor
  · intro h
    obtain ⟨p, hpn, hp, hq⟩ := h
    exact ⟨p, by omega, hp, hq⟩
  · intro h
    obtain ⟨p, hpn, hp, hq⟩ := h
    exact ⟨p, by omega, hp, hq⟩

theorem strongGoldbach_iff_positive_counts :
    StrongGoldbach <-> forall n : Nat,
      4 <= n -> n % 2 = 0 -> 0 < representationCount n := by
  constructor
  · intro h n hn heven
    exact (representationCount_pos_iff n).mpr (h n hn heven)
  · intro h n hn heven
    exact (representationCount_pos_iff n).mp (h n hn heven)

theorem count_sum_le_length_add_overlap {a : Type} (xs : List a)
    (left right : a -> Bool) :
    xs.countP left + xs.countP right <=
      xs.length + xs.countP (fun x => left x && right x) := by
  induction xs with
  | nil => simp
  | cons x xs ih =>
    cases hl : left x <;> cases hr : right x <;>
      simp_all <;> omega

theorem overlap_of_count_sum_gt {a : Type} (xs : List a)
    (left right : a -> Bool)
    (h : xs.length < xs.countP left + xs.countP right) :
    exists x, x ∈ xs /\ left x = true /\ right x = true := by
  have hlower := count_sum_le_length_add_overlap xs left right
  have hpos : 0 < xs.countP (fun x => left x && right x) := by omega
  obtain ⟨x, hx, hboth⟩ := List.countP_pos_iff.mp hpos
  simp only [Bool.and_eq_true] at hboth
  exact ⟨x, hx, hboth.1, hboth.2⟩

theorem goldbach_of_marginal_count_bound (n : Nat)
    (h : n + 1 < (List.range (n + 1)).countP isPrime +
      (List.range (n + 1)).countP (fun p => isPrime (n - p))) :
    Goldbach n := by
  have hlen : (List.range (n + 1)).length = n + 1 := List.length_range
  have hex := overlap_of_count_sum_gt (List.range (n + 1))
    isPrime (fun p => isPrime (n - p)) (by omega)
  obtain ⟨p, hmem, hp, hq⟩ := hex
  apply (goldbach_iff_reflection n).mpr
  exact ⟨p, by have := List.mem_range.mp hmem; omega,
    (isPrime_eq_true_iff p).mp hp, (isPrime_eq_true_iff (n - p)).mp hq⟩

end GoldbachResearch
