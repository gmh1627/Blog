import GoldbachResearch.Obstructions

namespace GoldbachResearch

def localComposite (m a : Nat) : Nat := (a + m) * (m + 1)

theorem localComposite_mod (m a : Nat) (hm : 2 <= m) :
    localComposite m a % m = a % m := by
  unfold localComposite
  rw [Nat.mul_add, Nat.mul_one]
  rw [Nat.mul_comm (a + m) m]
  rw [Nat.mul_add_mod_self_left]
  simp [Nat.add_mod]

theorem localComposite_not_prime (m a : Nat) (hm : 2 <= m) :
    ¬ Prime (localComposite m a) := by
  unfold localComposite
  have hd : 2 <= m + 1 := by omega
  have hleft : 1 < a + m := by omega
  have hlt : m + 1 < (a + m) * (m + 1) := by
    have hmul := Nat.mul_lt_mul_of_pos_right hleft (by omega : 0 < m + 1)
    simpa using hmul
  apply not_prime_of_proper_divisor (d := m + 1)
    (n := (a + m) * (m + 1)) hd hlt
  exact Nat.dvd_mul_left (m + 1) (a + m)

theorem finite_modulus_cannot_certify_prime (m : Nat) (hm : 2 <= m) :
    forall a : Nat, exists x : Nat,
      x % m = a % m /\ ¬ Prime x := by
  intro a
  exact ⟨localComposite m a, localComposite_mod m a hm,
    localComposite_not_prime m a hm⟩

theorem finite_modulus_false_positive_pair (m : Nat) (hm : 2 <= m) :
    forall a b : Nat, exists x y : Nat,
      x % m = a % m /\ y % m = b % m /\
      (x + y) % m = (a + b) % m /\
      ¬ Prime x /\ ¬ Prime y := by
  intro a b
  have hxa := localComposite_mod m a hm
  have hxb := localComposite_mod m b hm
  refine ⟨localComposite m a, localComposite m b, hxa, hxb, ?_,
    localComposite_not_prime m a hm, localComposite_not_prime m b hm⟩
  simp [Nat.add_mod, hxa, hxb]

def localCompositeAt (m a k : Nat) : Nat :=
  localComposite m (a + k * m)

theorem localCompositeAt_mod (m a k : Nat) (hm : 2 <= m) :
    localCompositeAt m a k % m = a % m := by
  unfold localCompositeAt
  rw [localComposite_mod m (a + k * m) hm]
  rw [Nat.mul_comm k m]
  exact Nat.add_mul_mod_self_left a m k

theorem exists_large_composite_same_residue (m a T : Nat) (hm : 2 <= m) :
    exists x : Nat, T <= x /\ x % m = a % m /\ ¬ Prime x := by
  refine ⟨localCompositeAt m a T, ?_, localCompositeAt_mod m a T hm, ?_⟩
  · unfold localCompositeAt localComposite
    have hTm : T <= T * m := Nat.le_mul_of_pos_right T (by omega)
    have hTmFactor : T * m <= (T * m) * (m + 1) :=
      Nat.le_mul_of_pos_right (T * m) (by omega)
    have hFactor : (T * m) * (m + 1) <=
        (a + T * m + m) * (m + 1) := by
      apply Nat.mul_le_mul_right
      omega
    omega
  · exact localComposite_not_prime m (a + T * m) hm

end GoldbachResearch
