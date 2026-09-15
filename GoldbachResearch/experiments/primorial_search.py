"""Adversarial search on primorial multiples below 2^64.

The candidate-prime bound is explicit. A target with no hit is unresolved,
never a counterexample, because a larger first prime may still work.
"""

import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import time

from sympy import isprime, primerange


MAX_N = (1 << 64) - 2


def run(bound, first_prime_cutoff):
    small_primes = list(primerange(2, bound + 1))
    first_primes = list(primerange(3, first_prime_cutoff + 1))
    base = 2 * math.prod(small_primes)
    if base > MAX_N:
        raise ValueError("Primorial base is outside the 64-bit search domain")
    rows = []
    unresolved = []
    max_first = None
    start = time.perf_counter()
    for k in range(1, MAX_N // base + 1):
        n = k * base
        witness = None
        for p in first_primes:
            if 2 * p > n:
                break
            if isprime(n - p):
                witness = (p, n - p)
                break
        if witness is None:
            unresolved.append(n)
        else:
            p, q = witness
            row = {"k": k, "n": str(n), "p": str(p), "q": str(q)}
            rows.append(row)
            if max_first is None or p > int(max_first["p"]):
                max_first = row
        if k % 5000 == 0:
            print(f"primorial {bound}: {k}/{MAX_N // base}", flush=True)
    return {
        "primorial_bound": bound,
        "base": str(base),
        "multiple_count": MAX_N // base,
        "first_prime_cutoff": first_prime_cutoff,
        "witness_count": len(rows),
        "unresolved_count": len(unresolved),
        "unresolved_targets": [str(n) for n in unresolved],
        "maximum_found_first_prime": max_first,
        "elapsed_seconds": round(time.perf_counter() - start, 3),
        "witnesses": rows,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--first-prime-cutoff", type=int, default=1000)
    parser.add_argument("--bounds", type=int, nargs="+", default=[41, 47])
    args = parser.parse_args()
    result = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "method": "deterministic SymPy isprime for n < 2^64",
        "runs": [run(bound, args.first_prime_cutoff) for bound in args.bounds],
        "trust": "finite bounded search; unresolved targets are not counterexamples",
    }
    output = Path(__file__).parent / "results" / "primorial-search.json"
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "runs": [{k: row[k] for k in
                  ("primorial_bound", "base", "multiple_count", "witness_count",
                   "unresolved_count", "maximum_found_first_prime", "elapsed_seconds")}
                 for row in result["runs"]]
    }, indent=2))


if __name__ == "__main__":
    main()
