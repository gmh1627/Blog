import GoldbachResearch.Basic

namespace GoldbachResearch

theorem goldbach_iff_reflection (n : Nat) :
    Goldbach n <-> exists p : Nat, p <= n /\ Prime p /\ Prime (n - p) := by
  constructor
  · intro h
    obtain ⟨p, q, hp, hq, heq⟩ := h
    have hsub : n - p = q := by omega
    exact ⟨p, by omega, hp, hsub.symm ▸ hq⟩
  · intro h
    obtain ⟨p, hpn, hp, hq⟩ := h
    exact ⟨p, n - p, hp, hq, by omega⟩

theorem goldbach_iff_half_search (n : Nat) :
    Goldbach n <-> exists p : Nat, p <= n / 2 /\ Prime p /\ Prime (n - p) := by
  constructor
  · intro h
    obtain ⟨p, q, hp, hq, heq⟩ := h
    by_cases hpq : p <= q
    · have hsub : n - p = q := by omega
      exact ⟨p, by omega, hp, hsub.symm ▸ hq⟩
    · have hsub : n - q = p := by omega
      exact ⟨q, by omega, hq, hsub.symm ▸ hp⟩
  · intro h
    obtain ⟨p, hpn, hp, hq⟩ := h
    exact (goldbach_iff_reflection n).mpr ⟨p, by omega, hp, hq⟩

theorem prime_even_eq_two {p : Nat} (hp : Prime p) (heven : p % 2 = 0) :
    p = 2 := by
  have hd : 2 ∣ p := Nat.dvd_of_mod_eq_zero heven
  have h := hp.2 2 hd
  omega

theorem prime_ne_two_is_odd {p : Nat} (hp : Prime p) (hne : p ≠ 2) :
    p % 2 = 1 := by
  have hcases := Nat.mod_two_eq_zero_or_one p
  cases hcases with
  | inl h => exact False.elim (hne (prime_even_eq_two hp h))
  | inr h => exact h

theorem goldbach_above_four_iff_odd_primes {n : Nat}
    (hn : 4 < n) (heven : n % 2 = 0) :
    Goldbach n <-> exists p q : Nat,
      Prime p /\ Prime q /\ p % 2 = 1 /\ q % 2 = 1 /\ p + q = n := by
  constructor
  · intro h
    obtain ⟨p, q, hp, hq, heq⟩ := h
    have hpne : p ≠ 2 := by
      intro htwo
      have hqeven : q % 2 = 0 := by omega
      have hqtwo := prime_even_eq_two hq hqeven
      omega
    have hqne : q ≠ 2 := by
      intro htwo
      have hpeven : p % 2 = 0 := by omega
      have hptwo := prime_even_eq_two hp hpeven
      omega
    exact ⟨p, q, hp, hq, prime_ne_two_is_odd hp hpne,
      prime_ne_two_is_odd hq hqne, heq⟩
  · intro h
    obtain ⟨p, q, hp, hq, _, _, heq⟩ := h
    exact ⟨p, q, hp, hq, heq⟩

def GoldbachUpTo (bound : Nat) : Prop :=
  forall n : Nat, 4 <= n -> n <= bound -> n % 2 = 0 -> Goldbach n

def GoldbachAbove (bound : Nat) : Prop :=
  forall n : Nat, 4 <= n -> bound < n -> n % 2 = 0 -> Goldbach n

theorem strongGoldbach_iff_bounded_and_tail (bound : Nat) :
    StrongGoldbach <-> GoldbachUpTo bound /\ GoldbachAbove bound := by
  constructor
  · intro h
    exact ⟨fun n hn _ heven => h n hn heven,
      fun n hn _ heven => h n hn heven⟩
  · intro h n hn heven
    by_cases hb : n <= bound
    · exact h.1 n hn hb heven
    · exact h.2 n hn (by omega) heven

theorem goldbachUpTo_mono {a b : Nat} (hab : a <= b)
    (h : GoldbachUpTo b) : GoldbachUpTo a := by
  intro n hn hna heven
  exact h n hn (by omega) heven

theorem goldbach_double_prime {p : Nat} (hp : Prime p) : Goldbach (2 * p) := by
  exact ⟨p, p, hp, hp, by omega⟩

end GoldbachResearch
