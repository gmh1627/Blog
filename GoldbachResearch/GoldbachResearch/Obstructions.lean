import GoldbachResearch.Basic

namespace GoldbachResearch

theorem not_prime_of_proper_divisor {d n : Nat}
    (hd : 2 <= d) (hdn : d < n) (hdiv : d ∣ n) :
    ¬ Prime n := by
  intro hn
  rcases hn.2 d hdiv with h | h <;> omega

theorem prime_summands_eq_of_dvd_sum {p q : Nat}
    (hp : Prime p) (hq : Prime q) (hdiv : p ∣ p + q) :
    p = q := by
  have hpq : p ∣ q := (Nat.dvd_add_iff_right (Nat.dvd_refl p)).mpr hdiv
  rcases hq.2 p hpq with h | h
  · have := hp.1
    omega
  · exact h

theorem member_dvd_list_prod {p : Nat} {ps : List Nat}
    (hmem : p ∈ ps) : p ∣ ps.prod := by
  induction ps with
  | nil => simp at hmem
  | cons a ps ih =>
    simp only [List.mem_cons] at hmem
    rcases hmem with h | h
    · subst p
      exact Nat.dvd_mul_right a ps.prod
    · exact Nat.dvd_mul_left_of_dvd (ih h) a

def avoidingEven (ps : List Nat) (threshold : Nat) : Nat :=
  2 * ((threshold + 2) * ps.prod)

theorem avoidingEven_spec (ps : List Nat) (threshold : Nat)
    (hps : forall p, p ∈ ps -> Prime p) :
    4 <= avoidingEven ps threshold /\
    threshold <= avoidingEven ps threshold /\
    2 ∣ avoidingEven ps threshold /\
    (forall p, p ∈ ps -> p < avoidingEven ps threshold /\
      ¬ Prime (avoidingEven ps threshold - p)) := by
  have hprod : 0 < ps.prod :=
    List.prod_pos_iff_forall_pos_nat.mpr (by
      intro p hp
      have := (hps p hp).1
      omega)
  have hthreshold : threshold + 2 <= (threshold + 2) * ps.prod :=
    Nat.le_mul_of_pos_right (threshold + 2) hprod
  refine ⟨?_, ?_, ?_, ?_⟩
  · unfold avoidingEven
    omega
  · unfold avoidingEven
    omega
  · exact Nat.dvd_mul_right 2 ((threshold + 2) * ps.prod)
  · intro p hp
    have hpPrime : Prime p := hps p hp
    have hpdiv : p ∣ ps.prod := member_dvd_list_prod hp
    have hple : p <= ps.prod := Nat.le_of_dvd hprod hpdiv
    have hA : 1 < threshold + 2 := by omega
    have hprodlt : ps.prod < (threshold + 2) * ps.prod := by
      have hmul := Nat.mul_lt_mul_of_pos_right hA hprod
      simpa using hmul
    have hpA : p < (threshold + 2) * ps.prod :=
      Nat.lt_of_le_of_lt hple hprodlt
    have hplt : p < avoidingEven ps threshold - p := by
      unfold avoidingEven
      omega
    have hdiv : p ∣ avoidingEven ps threshold :=
      Nat.dvd_mul_left_of_dvd
        (Nat.dvd_mul_left_of_dvd hpdiv (threshold + 2)) 2
    refine ⟨by omega, ?_⟩
    exact not_prime_of_proper_divisor hpPrime.1 hplt
      (Nat.dvd_sub hdiv (Nat.dvd_refl p))

theorem no_finite_prime_witness_family (ps : List Nat)
    (hps : forall p, p ∈ ps -> Prime p) (threshold : Nat) :
    exists n : Nat, 4 <= n /\ threshold <= n /\ 2 ∣ n /\
      forall p, p ∈ ps -> ¬ Prime (n - p) := by
  refine ⟨avoidingEven ps threshold, ?_⟩
  obtain ⟨hfour, hthreshold, heven, havoid⟩ :=
    avoidingEven_spec ps threshold hps
  exact ⟨hfour, hthreshold, heven, fun p hp => (havoid p hp).2⟩

theorem summands_avoid_finite_family (ps : List Nat) (threshold p q : Nat)
    (hps : forall r, r ∈ ps -> Prime r)
    (hp : Prime p) (hq : Prime q)
    (hsum : p + q = avoidingEven ps threshold) :
    p ∉ ps /\ q ∉ ps := by
  have havoid := (avoidingEven_spec ps threshold hps).2.2.2
  constructor
  · intro hmem
    have hsub : avoidingEven ps threshold - p = q := by omega
    exact (havoid p hmem).2 (hsub.symm ▸ hq)
  · intro hmem
    have hsub : avoidingEven ps threshold - q = p := by omega
    exact (havoid q hmem).2 (hsub.symm ▸ hp)

end GoldbachResearch
