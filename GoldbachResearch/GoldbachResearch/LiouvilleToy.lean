import GoldbachResearch.Basic

namespace GoldbachResearch

def toySign (n : Nat) : Int :=
  if n = 1 then -1 else 1

def toyConvolution (n : Nat) : Int :=
  (List.range n).foldl
    (fun s k => if k = 0 then s else s + toySign k * toySign (n - k)) 0

theorem toy_no_double_minus_at_5 :
  forall k : Nat, 1 <= k -> k < 5 ->
      ¬ (toySign k = -1 /\ toySign (5 - k) = -1) := by
  intro k hk hlt
  have hk' : k = 1 \/ k = 2 \/ k = 3 \/ k = 4 := by omega
  rcases hk' with rfl | rfl | rfl | rfl <;> decide

theorem toy_convolution_at_5 : toyConvolution 5 = 0 := by
  decide

theorem toy_convolution_bound_at_5 :
    Int.natAbs (toyConvolution 5) < 4 := by
  rw [toy_convolution_at_5]
  decide

end GoldbachResearch
