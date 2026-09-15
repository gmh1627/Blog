import GoldbachResearch
import Lean

open Lean Elab Command in
run_cmd do
  let env <- getEnv
  let declarations := env.constants.fold (init := #[]) fun acc name info =>
    if (`GoldbachResearch).isPrefixOf name then acc.push (name, info) else acc
  let allowed := #[`propext, `Classical.choice, `Quot.sound]
  let mut checked : Nat := 0
  for (name, info) in declarations do
    match info with
    | .axiomInfo _ => throwError "Project declares an axiom: {name}"
    | _ => pure ()
    if info.isTheorem then
      let dependencies <- collectAxioms name
      for dependency in dependencies do
        unless allowed.contains dependency do
          throwError "Unapproved axiom in {name}: {dependency}"
      checked := checked + 1
  unless checked > 0 do
    throwError "No project theorems found"
  logInfo m!"Axiom audit passed for {checked} public project theorems."
  logInfo "Allowed foundational axioms: propext, Classical.choice, Quot.sound."

#print GoldbachResearch.StrongGoldbach
#print axioms GoldbachResearch.isPrime_eq_true_iff
#print axioms GoldbachResearch.goldbachCheck_eq_true_iff
#print axioms GoldbachResearch.strongGoldbach_iff_positive_counts
#print axioms GoldbachResearch.no_finite_prime_witness_family
#print axioms GoldbachResearch.checkUpTo_1000
#print axioms GoldbachResearch.goldbachUpTo_1000
#print axioms GoldbachResearch.rough_prime_majority_fails_at_68
#print axioms GoldbachResearch.goldbach_68_from_7
#print axioms GoldbachResearch.rough_prime_or_semiprime
#print axioms GoldbachResearch.counterexample_interval_residue_cover
#print axioms GoldbachResearch.yun_claimed_strict_cardinality_fails_at_10
#print axioms GoldbachResearch.strict_subset_does_not_reverse_membership
