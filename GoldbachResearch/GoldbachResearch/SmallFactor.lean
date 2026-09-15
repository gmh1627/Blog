import GoldbachResearch.SieveReduction

namespace GoldbachResearch

def SmallFactorCover (n : Nat) : Prop :=
  forall p : Nat, Prime p -> p <= n - 2 ->
    exists q : Nat, Prime q /\ q ∣ n - p /\ q * q <= n - p

def Semiprime (m : Nat) : Prop :=
  exists p q : Nat, Prime p /\ Prime q /\ p * q = m

def Rough (m z : Nat) : Prop :=
  forall d : Nat, 2 <= d -> d <= z -> ¬ d ∣ m

theorem composite_has_small_prime_factor {m : Nat}
    (hm : 2 <= m) (hcomp : ¬ Prime m) :
    exists q : Nat, Prime q /\ q ∣ m /\ q * q <= m := by
  have hproper : exists d : Nat, 2 <= d /\ d < m /\ d ∣ m := by
    by_cases hex : exists d : Nat, 2 <= d /\ d < m /\ d ∣ m
    · exact hex
    · exfalso
      apply hcomp
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
  obtain ⟨c, hmc⟩ := hdiv
  have hddiv : d ∣ m := ⟨c, hmc⟩
  have hcdiv : c ∣ m := by
    refine ⟨d, ?_⟩
    simpa [Nat.mul_comm] using hmc
  have hc2 : 2 <= c := by
    have hc0 : c ≠ 0 := by
      intro hc
      subst c
      simp at hmc
      omega
    have hc1 : c ≠ 1 := by
      intro hc
      subst c
      simp at hmc
      omega
    omega
  by_cases hdc : d <= c
  · obtain ⟨q, hq, hqd⟩ := exists_prime_factor d hd2
    have hqle : q <= d := Nat.le_of_dvd (by omega) hqd
    have hq2 : q * q <= d * d := Nat.mul_self_le_mul_self hqle
    have hddc : d * d <= d * c := Nat.mul_le_mul_left d hdc
    have hqm : q * q <= m := by
      calc
        q * q <= d * d := hq2
        _ <= d * c := hddc
        _ = m := hmc.symm
    exact ⟨q, hq, Nat.dvd_trans hqd hddiv, hqm⟩
  · have hcd : c <= d := by omega
    obtain ⟨q, hq, hqc⟩ := exists_prime_factor c hc2
    have hqle : q <= c := Nat.le_of_dvd (by omega) hqc
    have hq2 : q * q <= c * c := Nat.mul_self_le_mul_self hqle
    have hccd : c * c <= d * c := by
      exact Nat.mul_le_mul_right c hcd
    have hqm : q * q <= m := by
      calc
        q * q <= c * c := hq2
        _ <= d * c := hccd
        _ = m := hmc.symm
    exact ⟨q, hq, Nat.dvd_trans hqc hcdiv, hqm⟩

theorem rough_prime_or_semiprime {m z : Nat}
    (hm : 2 <= m) (hrough : Rough m z)
    (hupper : m < (z + 1) ^ 3) :
    Prime m \/ Semiprime m := by
  by_cases hprime : Prime m
  · exact Or.inl hprime
  · obtain ⟨q, hq, hqd, hq2m⟩ := composite_has_small_prime_factor hm hprime
    have hqgt : z < q := by
      by_cases hzq : q <= z
      · exact False.elim (hrough q hq.1 hzq hqd)
      · omega
    obtain ⟨c, hmc⟩ := hqd
    have hc2 : 2 <= c := by
      have hqc : q * q <= q * c := by simpa [hmc] using hq2m
      have hqpos : 0 < q := by omega
      have hqlec : q <= c := Nat.le_of_mul_le_mul_left hqc hqpos
      exact Nat.le_trans hq.1 hqlec
    by_cases hcprime : Prime c
    · exact Or.inr ⟨q, c, hq, hcprime, hmc.symm⟩
    · obtain ⟨r, hr, hrc, hr2c⟩ := composite_has_small_prime_factor hc2 hcprime
      have hrcm : r ∣ m := Nat.dvd_trans hrc
        ⟨q, by simpa [Nat.mul_comm] using hmc⟩
      have hrgt : z < r := by
        by_cases hzr : r <= z
        · exact False.elim (hrough r hr.1 hzr hrcm)
        · omega
      have hbaseq : z + 1 <= q := by omega
      have hbaser : z + 1 <= r := by omega
      have hcube : (z + 1) ^ 3 <= q * r * r := by
        have hmul := Nat.mul_le_mul (Nat.mul_le_mul hbaseq hbaser) hbaser
        simpa [Nat.pow_succ, Nat.mul_assoc, Nat.mul_comm] using hmul
      have hqrr : q * r * r <= m := by
        obtain ⟨k, hck⟩ := hrc
        have hqr : q * (r * r) <= q * c :=
          Nat.mul_le_mul_left q hr2c
        calc
          q * r * r = q * (r * r) := by simp [Nat.mul_assoc]
          _ <= q * c := hqr
          _ = m := hmc.symm
      exact False.elim (by omega)

theorem counterexample_has_small_prime_complement_factor {n : Nat}
    (hn : 4 <= n) (hnot : ¬ Goldbach n) {p : Nat}
    (hp : Prime p) (hpp : p <= n - 2) :
    exists q : Nat, Prime q /\ q ∣ n - p /\ q * q <= n - p := by
  have hcomp : ¬ Prime (n - p) := by
    intro hprime
    apply hnot
    refine ⟨p, n - p, hp, hprime, ?_⟩
    have hp_le : p <= n := by omega
    omega
  exact composite_has_small_prime_factor (by omega) hcomp

theorem counterexample_interval_residue_cover {n p : Nat}
    (hn : 4 <= n) (hnot : ¬ Goldbach n) (hp : Prime p)
    (hpupper : p <= n / 2) :
    exists q : Nat, Prime q /\ q * q <= n /\ p % q = n % q := by
  have hpbound : p <= n - 2 := by omega
  obtain ⟨q, hq, hdiv, hqbound⟩ :=
    counterexample_has_small_prime_complement_factor hn hnot hp hpbound
  obtain ⟨k, hkm⟩ := hdiv
  have hsum : n = p + q * k := by omega
  have hmod : n % q = p % q := by
    rw [hsum]
    exact Nat.add_mul_mod_self_left p q k
  exact ⟨q, hq, by omega, hmod.symm⟩

theorem strongGoldbach_iff_no_small_factor_cover :
    StrongGoldbach <->
      ¬ (exists n : Nat, 4 <= n /\ n % 2 = 0 /\ SmallFactorCover n) := by
  constructor
  · intro hstrong hex
    obtain ⟨n, hn, heven, hcover⟩ := hex
    obtain ⟨p, q, hp, hq, hsum⟩ := hstrong n hn heven
    have hq2 : 2 <= q := hq.1
    have hpbound : p <= n - 2 := by omega
    obtain ⟨r, hr, hdiv, hrsq⟩ := hcover p hp hpbound
    have hsub : n - p = q := by omega
    have hdivq : r ∣ q := by simpa [hsub] using hdiv
    have hprimeDiv := hq.2 r hdivq
    have hrsq' : r * r <= q := by simpa [hsub] using hrsq
    have hr2 : 2 <= r := hr.1
    rcases hprimeDiv with hone | hself
    · omega
    · subst r
      have hqq : q < q * q := by
        have hmul := Nat.mul_lt_mul_of_pos_right hq2 (by omega : 0 < q)
        simpa [Nat.one_mul] using hmul
      omega
  · intro hnone n hn heven
    by_cases hg : Goldbach n
    · exact hg
    · exfalso
      apply hnone
      refine ⟨n, hn, heven, ?_⟩
      intro p hp hpp
      exact counterexample_has_small_prime_complement_factor hn hg hp hpp

end GoldbachResearch
