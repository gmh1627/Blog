"""Verify complete-factorization Lucas certificates using only Python integers."""

import json
import math
import sys


def verify_prime(n, nodes, verified, active):
    if n in verified:
        return
    if n == 2:
        verified.add(n)
        return
    if n < 3 or n % 2 == 0 or n in active:
        raise ValueError(f"Invalid prime node: {n}")
    node = nodes[str(n)]
    if int(node["n"]) != n:
        raise ValueError("Node key mismatch")
    active.add(n)
    factors = [(int(item["prime"]), item["exponent"]) for item in node["factors"]]
    if not factors or len({p for p, _ in factors}) != len(factors):
        raise ValueError("Missing or repeated factors")
    product = 1
    for p, exponent in factors:
        if not isinstance(exponent, int) or exponent < 1 or not 2 <= p < n:
            raise ValueError("Invalid factor")
        verify_prime(p, nodes, verified, active)
        product *= p ** exponent
    if product != n - 1:
        raise ValueError("Incomplete factorization")
    a = int(node["base"])
    if not 1 < a < n or pow(a, n - 1, n) != 1:
        raise ValueError("Fermat condition failed")
    for p, _ in factors:
        if math.gcd(pow(a, (n - 1) // p, n) - 1, n) != 1:
            raise ValueError("Lucas order condition failed")
    active.remove(n)
    verified.add(n)


def verify_document(document):
    verified = set()
    roots = document["goldbach_witnesses"]
    if not roots:
        raise ValueError("No Goldbach witnesses")
    for root in roots:
        n, p, q = (int(root[key]) for key in ("n", "p", "q"))
        if n < 4 or n % 2 or p + q != n:
            raise ValueError("Invalid sum")
        verify_prime(p, document["nodes"], verified, set())
        verify_prime(q, document["nodes"], verified, set())
    return {"verified_sums": len(roots), "verified_prime_nodes": len(verified)}


if __name__ == "__main__":
    with open(sys.argv[1], encoding="utf-8") as certificate_file:
        print(json.dumps(verify_document(json.load(certificate_file)), indent=2))
