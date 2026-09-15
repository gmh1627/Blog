"""Finite counterexample searches and a cube-root/Liouville route diagnostic.

Large searches are witness searches with a bounded first summand. A no-hit is
unresolved, never a counterexample. JSON encodes large integers as strings.
"""

import argparse
from array import array
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import platform
import random
import time

import sympy
from sympy import factorint, isprime

from verify_certificates import verify_document


PUBLISHED_BOUND = 4_000_000_000_000_000_000
MAX_N = (1 << 64) - 2


def sieve(limit):
    flags = bytearray(b"\x01") * (limit + 1)
    flags[:2] = b"\x00\x00"
    for p in range(2, math.isqrt(limit) + 1):
        if flags[p]:
            start = p * p
            flags[start:limit + 1:p] = b"\x00" * ((limit - start) // p + 1)
    return flags, [p for p in range(2, limit + 1) if flags[p]]


def trial_prime(n):
    if n < 2:
        return False
    for d in range(2, math.isqrt(n) + 1):
        if n % d == 0:
            return False
    return True


def dense_search(limit, flags, primes):
    records = []
    checked = 0
    max_p = 0
    digest = hashlib.sha256()
    for n in range(4, limit + 1, 2):
        witness = None
        for p in primes:
            if 2 * p > n:
                break
            if flags[n - p]:
                witness = (p, n - p)
                break
        if witness is None:
            return {"checked_even_count": checked, "counterexample_candidate": n}
        p, q = witness
        digest.update(f"{n}:{p}:{q}\n".encode("ascii"))
        checked += 1
        if p > max_p:
            if not isprime(p) or not isprime(q):
                raise RuntimeError("Independent check of record witness failed")
            max_p = p
            records.append({"n": n, "p": p, "q": q})
    return {"inclusive_limit": limit, "checked_even_count": checked,
            "counterexample_candidate": None, "least_summand_records": records,
            "witness_stream_sha256": digest.hexdigest()}


def parity_diagnostic(limit, flags, primes):
    spf = array("I", [0]) * (limit + 1)
    omega = bytearray(limit + 1)
    for p in primes:
        if p > limit:
            break
        spf[p] = p
        for m in range(p * p, limit + 1, p):
            if not spf[m]:
                spf[m] = p
    for m in range(2, limit + 1):
        omega[m] = omega[m // spf[m]] + 1
    positive_examples = []
    positive_count = 0
    last_positive = None
    minimum_margin = None
    empty = []
    z = 1
    for n in range(4, limit + 1, 2):
        while (z + 1) ** 3 <= n:
            z += 1
        sifted = liouville = representations = actual = 0
        detail = []
        for p in primes:
            if 2 * p > n:
                break
            m = n - p
            actual += int(bool(flags[m]))
            if spf[m] <= z:
                continue
            if not 1 <= omega[m] <= 2:
                raise RuntimeError("Cube-root factor bound failed")
            sifted += 1
            liouville += -1 if omega[m] % 2 else 1
            representations += int(bool(flags[m]))
            if n == 68:
                detail.append({"p": p, "complement": m, "omega": omega[m]})
        if 2 * representations != sifted - liouville or representations != actual:
            raise RuntimeError("Exact detector identity failed")
        row = {"n": n, "z": z, "S": sifted, "L": liouville,
               "r": representations}
        if n == 68:
            example68 = {**row, "candidates": detail}
        if not sifted:
            empty.append(n)
        elif (minimum_margin is None or
              2 * representations * minimum_margin["S"] <
              2 * minimum_margin["r"] * sifted):
            minimum_margin = row
        if liouville > 0:
            positive_count += 1
            last_positive = row
            if len(positive_examples) < 30:
                positive_examples.append(row)
    return {"inclusive_limit": limit, "identity_verified": True,
            "empty_sifted_targets": empty, "positive_L_count": positive_count,
            "first_positive_L_examples": positive_examples,
            "last_positive_L": last_positive,
            "minimum_observed_margin_2r_over_S": minimum_margin,
            "example_68": example68}


def large_targets(count, primes, rng):
    targets = {}
    quarter = count // 4
    for i in range(quarter):
        targets[PUBLISHED_BOUND + 2 + 2 * i] = "above_published_bound"
        targets[MAX_N - 2 * i] = "near_uint64_limit"
    moduli = [(bound, math.prod(p for p in primes if p <= bound))
              for bound in (11, 17, 23, 29, 31, 37, 41, 43, 47)]
    added = 0
    while added < quarter:
        bound, modulus = moduli[rng.randrange(len(moduli))]
        low = (PUBLISHED_BOUND + 1 + modulus - 1) // modulus
        high = MAX_N // modulus
        n = modulus * rng.randint(low, high)
        if n not in targets:
            targets[n] = f"primorial_{bound}"
            added += 1
    while len(targets) < count:
        n = 2 * rng.randint(PUBLISHED_BOUND // 2 + 1, MAX_N // 2)
        targets.setdefault(n, "seeded_uniform")
    return targets


def large_search(count, cutoff, primes, rng):
    rows, unresolved = [], []
    candidates = [p for p in primes if p <= cutoff]
    families = {}
    start = time.perf_counter()
    for i, (n, family) in enumerate(large_targets(count, primes, rng).items(), 1):
        if not PUBLISHED_BOUND < n <= MAX_N or n % 2:
            raise RuntimeError("Target escaped deterministic primality domain")
        families[family] = families.get(family, 0) + 1
        for p in candidates:
            if 2 * p > n:
                break
            q = n - p
            if isprime(q):
                if not isprime(p):
                    raise RuntimeError("Sieve false positive")
                rows.append({"n": str(n), "p": str(p), "q": str(q),
                             "family": family})
                break
        else:
            unresolved.append({"n": str(n), "family": family})
            continue
        if i % 1000 == 0:
            print(f"large search: {i}/{count}, elapsed {time.perf_counter()-start:.1f}s",
                  flush=True)
    hardest = sorted(rows, key=lambda row: (int(row["p"]), int(row["n"])),
                     reverse=True)[:10]
    return rows, {"tested_target_count": count, "witness_count": len(rows),
                  "first_summand_cutoff": cutoff, "families": families,
                  "unresolved_not_counterexamples": unresolved,
                  "min_target": str(min(int(r["n"]) for r in rows)) if rows else None,
                  "max_target": str(max(int(r["n"]) for r in rows)) if rows else None,
                  "hardest_witnesses": hardest}


def certificate_document(roots):
    nodes = {}

    def certify(n):
        if n == 2 or str(n) in nodes:
            return
        factors = [(int(p), int(e)) for p, e in factorint(n - 1).items()]
        for p, _ in factors:
            certify(p)
        base = 2
        while not (pow(base, n - 1, n) == 1 and
                   all(math.gcd(pow(base, (n - 1) // p, n) - 1, n) == 1
                       for p, _ in factors)):
            base += 1
            if base >= n:
                raise RuntimeError("No Lucas certificate found")
        nodes[str(n)] = {"n": str(n), "base": str(base),
                         "factors": [{"prime": str(p), "exponent": e}
                                     for p, e in sorted(factors)]}

    for root in roots:
        certify(int(root["p"]))
        certify(int(root["q"]))
    document = {"method": "complete-factorization Lucas criterion",
                "goldbach_witnesses": roots, "nodes": nodes}
    document["verification"] = verify_document(document)
    return document


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=1_000_000)
    parser.add_argument("--large-count", type=int, default=4000)
    parser.add_argument("--prime-limit", type=int, default=100_000)
    parser.add_argument("--parity-limit", type=int, default=20_000)
    parser.add_argument("--seed", type=int, default=20260914)
    args = parser.parse_args()
    if args.limit < 100 or args.parity_limit < 68 or args.prime_limit < 47:
        parser.error("limit>=100, parity-limit>=68 and prime-limit>=47 required")
    if args.large_count < 4:
        parser.error("large-count>=4 required")
    started = time.perf_counter()
    output = Path(__file__).parent / "results"
    output.mkdir(exist_ok=True)
    limit = max(args.limit, args.prime_limit, args.parity_limit)
    flags, primes = sieve(limit)
    for n in range(min(limit, 10_000) + 1):
        if bool(flags[n]) != trial_prime(n):
            raise RuntimeError("Sieve/trial-division mismatch")
    print("sieve independent cross-check passed", flush=True)
    dense = dense_search(args.limit, flags, primes)
    if dense["counterexample_candidate"] is not None:
        raise RuntimeError(f"Exact small-range failure: {dense}")
    print(f"dense search: {dense['checked_even_count']} even targets", flush=True)
    parity = parity_diagnostic(args.parity_limit, flags, primes)
    print(f"parity diagnostic: {parity['positive_L_count']} positive-L targets", flush=True)
    rows, large = large_search(args.large_count, args.prime_limit, primes,
                               random.Random(args.seed))
    with (output / "large-witnesses.jsonl").open("w", encoding="utf-8") as file:
        for row in rows:
            file.write(json.dumps(row) + "\n")
    roots = large["hardest_witnesses"][:1]
    for family in ("near_uint64_limit", "primorial_47"):
        match = next((r for r in rows if r["family"] == family and r not in roots), None)
        if match:
            roots.append(match)
    print("generating independent Lucas certificates", flush=True)
    certificates = certificate_document(roots)
    (output / "lucas-certificates.json").write_text(
        json.dumps(certificates, indent=2) + "\n", encoding="utf-8")
    summary = {"generated_utc": datetime.now(timezone.utc).isoformat(),
               "python": platform.python_version(), "sympy": sympy.__version__,
               "arguments": vars(args), "dense": dense, "parity": parity,
               "large": large, "certificates": certificates["verification"],
               "elapsed_seconds": round(time.perf_counter() - started, 3),
               "trust": "Machine computation; not Lean-verified. No universal conclusion."}
    (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"dense_checked": dense["checked_even_count"],
                      "large_witnesses": large["witness_count"],
                      "large_unresolved": len(large["unresolved_not_counterexamples"]),
                      "parity_first_failure": parity["first_positive_L_examples"][:1],
                      "certificates": certificates["verification"],
                      "elapsed_seconds": summary["elapsed_seconds"]}, indent=2))


if __name__ == "__main__":
    main()
