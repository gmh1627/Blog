import copy
import math
import unittest

from verify_certificates import verify_document


def small_document():
    return {
        "goldbach_witnesses": [{"n": "34", "p": "3", "q": "31"}],
        "nodes": {
            "3": {"n": "3", "base": "2",
                  "factors": [{"prime": "2", "exponent": 1}]},
            "5": {"n": "5", "base": "2",
                  "factors": [{"prime": "2", "exponent": 2}]},
            "31": {"n": "31", "base": "3",
                   "factors": [{"prime": "2", "exponent": 1},
                               {"prime": "3", "exponent": 1},
                               {"prime": "5", "exponent": 1}]},
        },
    }


class CertificateTests(unittest.TestCase):
    def test_valid_recursive_certificate(self):
        self.assertEqual(verify_document(small_document()),
                         {"verified_sums": 1, "verified_prime_nodes": 4})

    def test_two_base_case(self):
        result = verify_document({"goldbach_witnesses": [{"n": "4", "p": "2", "q": "2"}],
                                  "nodes": {}})
        self.assertEqual(result["verified_prime_nodes"], 1)

    def test_wrong_sum_rejected(self):
        document = small_document()
        document["goldbach_witnesses"][0]["n"] = "36"
        with self.assertRaisesRegex(ValueError, "Invalid sum"):
            verify_document(document)

    def test_incomplete_factorization_rejected(self):
        document = small_document()
        document["nodes"]["31"]["factors"].pop()
        with self.assertRaisesRegex(ValueError, "Incomplete factorization"):
            verify_document(document)

    def test_fermat_pseudoprime_rejected(self):
        self.assertEqual(pow(2, 340, 341), 1)
        document = small_document()
        document["goldbach_witnesses"] = [{"n": "344", "p": "3", "q": "341"}]
        document["nodes"]["17"] = {
            "n": "17", "base": "3", "factors": [{"prime": "2", "exponent": 4}]}
        document["nodes"]["341"] = {
            "n": "341", "base": "2", "factors": [{"prime": "2", "exponent": 2},
                                                     {"prime": "5", "exponent": 1},
                                                     {"prime": "17", "exponent": 1}]}
        self.assertGreater(math.gcd(pow(2, 170, 341) - 1, 341), 1)
        with self.assertRaisesRegex(ValueError, "Lucas order condition"):
            verify_document(document)

    def test_duplicate_factor_rejected(self):
        document = small_document()
        document["nodes"]["31"]["factors"].append(
            copy.deepcopy(document["nodes"]["31"]["factors"][0]))
        with self.assertRaisesRegex(ValueError, "repeated factors"):
            verify_document(document)


if __name__ == "__main__":
    unittest.main()
