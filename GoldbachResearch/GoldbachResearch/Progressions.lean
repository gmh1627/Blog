import GoldbachResearch.Obstructions

namespace GoldbachResearch

/--
For every finite family of primes, there are arbitrarily large even targets
for which no member of that family can be a Goldbach summand.  The target for
parameter `k` is `avoidingEven ps (threshold + k)`; the divisibility argument
and the strict size bound are proved by `avoidingEven_spec`.
-/
theorem exists_arbitrarily_large_avoiding (ps : List Nat)
    (hps : forall p, p ∈ ps -> Prime p) (threshold : Nat) :
    forall k : Nat, exists n : Nat,
      4 <= n /\ threshold + k <= n /\ 2 ∣ n /\
        forall p, p ∈ ps -> ¬ Prime (n - p) := by
  intro k
  obtain ⟨hfour, htk, heven, havoid⟩ :=
    avoidingEven_spec ps (threshold + k) hps
  refine ⟨avoidingEven ps (threshold + k), hfour, htk, heven, ?_⟩
  · intro p hp
    exact (havoid p hp).2

end GoldbachResearch
