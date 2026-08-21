"""
GSTIN validation — the Vendor Trust Layer from Section C of the deck.

A GSTIN is 15 characters:
  [0:2]   state code (01-38 currently valid range, allow 01-37 + 97/99 special)
  [2:12]  10-character PAN
  [12]    entity number (1-9, A-Z)
  [13]    fixed literal 'Z'
  [14]    checksum digit, computed with a mod-36 algorithm

This runs BEFORE Stage 1 hard-filtering (see firewall.py) — a vendor with a
malformed or fabricated GSTIN never reaches scoring at all.
"""
from __future__ import annotations

import re
from .schemas import GstinCheck

_CODE_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
_GSTIN_RE = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[A-Z0-9]$")

# Valid Indian state/UT codes (01-38), plus 97 (other territory) 99 (centre jurisdiction)
_VALID_STATE_CODES = {f"{i:02d}" for i in range(1, 39)} | {"97", "99"}


def _checksum_digit(gstin_14: str) -> str:
    """Standard GSTIN mod-36 checksum over the first 14 characters."""
    total = 0
    for i, ch in enumerate(gstin_14):
        value = _CODE_CHARS.index(ch)
        weight = 2 if i % 2 == 1 else 1
        product = value * weight
        total += product // 36 + product % 36
    remainder = total % 36
    check_code_point = (36 - remainder) % 36
    return _CODE_CHARS[check_code_point]


def validate_gstin(gstin: str, claimed_msme: bool = False) -> GstinCheck:
    gstin = (gstin or "").strip().upper()

    structurally_valid = bool(_GSTIN_RE.match(gstin)) and len(gstin) == 15
    state_code_valid = structurally_valid and gstin[0:2] in _VALID_STATE_CODES

    checksum_valid = False
    if structurally_valid:
        expected = _checksum_digit(gstin[:14])
        checksum_valid = expected == gstin[14]

    verdict = structurally_valid and state_code_valid and checksum_valid

    if not structurally_valid:
        detail = "Invalid GSTIN — malformed structure (expected 15-char PAN-based format)."
    elif not state_code_valid:
        detail = "Invalid GSTIN — unrecognised state code."
    elif not checksum_valid:
        detail = "Invalid GSTIN — checksum mismatch."
    else:
        detail = "GSTIN structurally valid, state code valid, checksum verified."

    return GstinCheck(
        gstin=gstin,
        structurally_valid=structurally_valid,
        checksum_valid=checksum_valid,
        state_code_valid=state_code_valid,
        is_msme_udyam=claimed_msme,
        verdict=verdict,
        detail=detail,
    )


def generate_valid_gstin(state_code: str = "33", pan: str = "AABCV1234F") -> str:
    """Utility used only by the seed data / tests to mint a GSTIN whose
    checksum actually verifies, so demo vendors aren't accidentally invalid.
    `pan` must follow real PAN shape: 5 letters, 4 digits, 1 letter."""
    entity = "1"
    body = f"{state_code}{pan.upper()}{entity}Z"
    check = _checksum_digit(body)
    return body + check
