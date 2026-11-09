"""Deterministic transcript checks; no network or model calls."""

import re
import unicodedata


def words(text: str | None) -> list[str]:
    normalized = unicodedata.normalize('NFKC', text or '').casefold()
    return re.findall(r"[^\W_]+(?:'[^\W_]+)*", normalized.replace('’', "'"))


def wer(expected: str, got: str | None) -> float:
    reference, actual = words(expected), words(got)
    if not reference:
        return 0.0 if not actual else 1.0
    previous = list(range(len(actual) + 1))
    for i, token in enumerate(reference, 1):
        current = [i]
        for j, heard in enumerate(actual, 1):
            current.append(min(current[-1] + 1, previous[j] + 1,
                               previous[j - 1] + (token != heard)))
        previous = current
    return previous[-1] / len(reference)


def compare(expected: str, got: str | None,
            must_contain: list[str] | None = None,
            max_wer: float = 0.15) -> dict:
    actual = words(got)
    missing = []
    for phrase in must_contain or []:
        required = words(phrase)
        if not required or not any(
            actual[i:i + len(required)] == required
            for i in range(len(actual) - len(required) + 1)
        ):
            missing.append(phrase)
    rate = wer(expected, got)
    return {'ok': bool(actual) and rate <= max_wer and not missing,
            'wer': rate, 'missing': missing, 'empty': not actual}
