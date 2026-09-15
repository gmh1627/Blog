import Std

namespace GoldbachResearch

def Prime (n : Nat) : Prop :=
  2 ≤ n ∧ (∀ d : Nat, d ∣ n → d = 1 ∨ d = n)

def Goldbach (n : Nat) : Prop :=
  ∃ p q : Nat, Prime p ∧ Prime q ∧ p + q = n

def StrongGoldbach : Prop :=
  ∀ n : Nat, 4 ≤ n → n % 2 = 0 → Goldbach n

private def primeDivisorFree (n d : Nat) : Bool :=
  decide (d < 2 ∨ n % d ≠ 0)

def isPrime (n : Nat) : Bool :=
  decide (2 ≤ n) && (List.range n).all (primeDivisorFree n)

private theorem primeDivisorFree_eq_true (n d : Nat) :
    primeDivisorFree n d = true ↔ d < 2 ∨ n % d ≠ 0 := by
  simp [primeDivisorFree]

theorem isPrime_eq_true_iff (n : Nat) :
    isPrime n = true ↔ Prime n := by
  unfold isPrime Prime
  rw [Bool.and_eq_true]
  constructor
  · intro h
    rcases h with ⟨hn, hall⟩
    have hn' : 2 ≤ n := of_decide_eq_true hn
    refine ⟨hn', ?_⟩
    intro d hd
    by_cases hdn : d = n
    · exact Or.inr hdn
    by_cases hd1 : d = 1
    · exact Or.inl hd1
    have hpos : 0 < n := Nat.zero_lt_of_lt (Nat.lt_of_lt_of_le Nat.zero_lt_two hn')
    have hle : d ≤ n := Nat.le_of_dvd hpos hd
    have hlt : d < n := Nat.lt_of_le_of_ne hle hdn
    have hmem : d ∈ List.range n := (List.mem_range).2 hlt
    have hcheck := (List.all_eq_true.mp hall) d hmem
    have hfree : d < 2 ∨ n % d ≠ 0 := (primeDivisorFree_eq_true n d).mp hcheck
    rcases hfree with hsmall | hmod
    · left
      have hdne : d ≠ 0 := by
        intro hdz
        subst d
        have hnzero : n = 0 := by simpa using hd
        omega
      omega
    · exfalso
      exact hmod (Nat.mod_eq_zero_of_dvd hd)
  · intro hp
    rcases hp with ⟨hn, hprime⟩
    refine ⟨by simp [hn], ?_⟩
    apply (List.all_eq_true).2
    intro d hmem
    have hlt : d < n := (List.mem_range).1 hmem
    apply (primeDivisorFree_eq_true n d).2
    by_cases hsmall : d < 2
    · exact Or.inl hsmall
    · right
      intro hzero
      have hdvd : d ∣ n := Nat.dvd_of_mod_eq_zero hzero
      rcases hprime d hdvd with hd1 | hdn
      · omega
      · omega

def goldbachCheck (n : Nat) : Bool :=
  (List.range (n + 1)).any fun p =>
    isPrime p && isPrime (n - p)

theorem goldbachCheck_eq_true_iff (n : Nat) :
    goldbachCheck n = true ↔ Goldbach n := by
  unfold goldbachCheck Goldbach
  rw [List.any_eq_true]
  constructor
  · rintro ⟨p, hpMem, hpCheck⟩
    rw [Bool.and_eq_true] at hpCheck
    have hp : Prime p := (isPrime_eq_true_iff p).mp hpCheck.1
    have hpLe : p ≤ n := by
      have hplt : p < n + 1 := (List.mem_range).1 hpMem
      omega
    have hq : Prime (n - p) := (isPrime_eq_true_iff (n - p)).mp hpCheck.2
    exact ⟨p, n - p, hp, hq, Nat.add_sub_of_le hpLe⟩
  · rintro ⟨p, q, hp, hq, hpq⟩
    have hpLe : p ≤ n := by
      rw [← hpq]
      exact Nat.le_add_right p q
    refine ⟨p, (List.mem_range).2 (Nat.lt_succ_of_le hpLe), ?_⟩
    rw [Bool.and_eq_true]
    refine ⟨(isPrime_eq_true_iff p).mpr hp, ?_⟩
    refine (isPrime_eq_true_iff (n - p)).mpr ?_
    have hsub : n - p = q := by omega
    exact hsub.symm ▸ hq

end GoldbachResearch
