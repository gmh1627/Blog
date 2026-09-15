import GoldbachResearch.Reductions

namespace GoldbachResearch

def FactorCover (n : Nat) : Prop :=
  forall p : Nat, Prime p -> p <= n - 2 ->
    exists d : Nat, 2 <= d /\ d < n - p /\ d ∣ n - p

theorem prime_two : Prime 2 := by
  constructor
  · omega
  · intro d hd
    have hdle : d <= 2 := Nat.le_of_dvd (by omega) hd
    have hd0 : d ≠ 0 := by
      intro hz
      subst d
      simp at hd
    omega

theorem exists_prime_factor : forall m : Nat, 2 <= m ->
    exists q : Nat, Prime q /\ q ∣ m := by
  intro m
  induction m using Nat.strongRecOn with
  | ind m ih =>
    intro hm
    by_cases hprime : Prime m
    · exact ⟨m, hprime, Nat.dvd_refl m⟩
    · have hproper : exists d : Nat, 2 <= d /\ d < m /\ d ∣ m := by
        by_cases hex : exists d : Nat, 2 <= d /\ d < m /\ d ∣ m
        · exact hex
        · exfalso
          apply hprime
          constructor
          · exact hm
          · intro d hd
            by_cases hd1 : d = 1
            · exact Or.inl hd1
            by_cases hdm : d = m
            · exact Or.inr hdm
            exfalso
            apply hex
            have hmpos : 0 < m := by omega
            have hd0 : d ≠ 0 := by
              intro hz
              subst d
              have hz' : m = 0 := by simpa using hd
              omega
            have hdle : d <= m := Nat.le_of_dvd hmpos hd
            have hdge : 2 <= d := by omega
            have hdlt : d < m := Nat.lt_of_le_of_ne hdle hdm
            exact ⟨d, hdge, hdlt, hd⟩
      obtain ⟨d, hd2, hdm, hdiv⟩ := hproper
      obtain ⟨q, hq, hqd⟩ := ih d hdm hd2
      exact ⟨q, hq, Nat.dvd_trans hqd hdiv⟩

/--
If an even number is a counterexample, every prime candidate in the search
range has a proper divisor in its complementary summand.  This is the exact
finite factor-covering condition behind an Eratosthenes-sieve attack.
-/
theorem counterexample_has_composite_complements {n : Nat}
    (hn : 4 <= n) (hnot : ¬ Goldbach n) {p : Nat}
    (hp : Prime p) (hpp : p <= n - 2) :
    exists d : Nat, 2 <= d /\ d < n - p /\ d ∣ n - p := by
  have hq : ¬ Prime (n - p) := by
    intro hprime
    apply hnot
    refine ⟨p, n - p, hp, hprime, ?_⟩
    have hp_le : p <= n := by omega
    omega
  by_cases hex : ∃ d : Nat, 2 <= d /\ d < n - p /\ d ∣ n - p
  · exact hex
  · exfalso
    apply hq
    refine ⟨by omega, ?_⟩
    intro d hd
    by_cases hd1 : d = 1
    · exact Or.inl hd1
    by_cases hdq : d = n - p
    · exact Or.inr hdq
    exfalso
    apply hex
    have hd0 : d ≠ 0 := by
      intro hz
      subst d
      have hz' : n - p = 0 := by simpa using hd
      omega
    have hdge : 2 <= d := by omega
    have hdpos : 0 < n - p := by omega
    have hdle : d <= n - p := Nat.le_of_dvd hdpos hd
    have hdlt : d < n - p := Nat.lt_of_le_of_ne hdle hdq
    exact ⟨d, hdge, hdlt, hd⟩

theorem counterexample_two_complement {n : Nat}
    (hn : 4 <= n) (hnot : ¬ Goldbach n) : ¬ Prime (n - 2) := by
  intro hprime
  apply hnot
  exact ⟨2, n - 2, prime_two, hprime, by omega⟩

theorem counterexample_half_composite {n : Nat}
    (_hn : 4 <= n) (heven : n % 2 = 0) (hnot : ¬ Goldbach n) :
    ¬ Prime (n / 2) := by
  intro hprime
  apply hnot
  exact ⟨n / 2, n / 2, hprime, hprime, by omega⟩

theorem counterexample_cover_all_prime_candidates {n : Nat}
    (hn : 4 <= n) (hnot : ¬ Goldbach n) :
    forall p : Nat, Prime p -> p <= n - 2 ->
      exists d : Nat, 2 <= d /\ d < n - p /\ d ∣ n - p := by
  intro p hp hpp
  exact counterexample_has_composite_complements hn hnot hp hpp

theorem counterexample_has_prime_complement_factor {n : Nat}
    (hn : 4 <= n) (hnot : ¬ Goldbach n) {p : Nat}
    (hp : Prime p) (hpp : p <= n - 2) :
    exists q : Nat, Prime q /\ q ∣ n - p := by
  obtain ⟨d, hd, _, hdiv⟩ :=
    counterexample_has_composite_complements hn hnot hp hpp
  obtain ⟨q, hq, hqd⟩ := exists_prime_factor (n - p) (by omega)
  exact ⟨q, hq, hqd⟩

theorem strongGoldbach_iff_no_factor_cover :
    StrongGoldbach <->
      ¬ (exists n : Nat, 4 <= n /\ n % 2 = 0 /\ FactorCover n) := by
  constructor
  · intro hstrong hex
    obtain ⟨n, hn, heven, hcover⟩ := hex
    obtain ⟨p, q, hp, hq, hsum⟩ := hstrong n hn heven
    have hq2 : 2 <= q := hq.1
    have hpbound : p <= n - 2 := by omega
    obtain ⟨d, hd, hdq, hdiv⟩ := hcover p hp hpbound
    have hsub : n - p = q := by omega
    have hdivq : d ∣ q := by simpa [hsub] using hdiv
    have hprimeDiv := hq.2 d hdivq
    rcases hprimeDiv with hone | hself <;> omega
  · intro hnone n hn heven
    by_cases hg : Goldbach n
    · exact hg
    · exfalso
      apply hnone
      exact ⟨n, hn, heven,
        counterexample_cover_all_prime_candidates hn hg⟩

end GoldbachResearch
