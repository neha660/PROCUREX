"""
Structured Audit Log + Counterfactual Decision Receipt (Section E, Slide 13).

Every field is plain structured data — "pipes straight into an ERP or
spreadsheet export." audit_hash gives a cheap tamper-evident fingerprint
for reconciliation (a real deployment would use a signed hash chain;
this is a readable stand-in for the same idea).
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone

from .schemas import AuditEntry

_LOG: list[AuditEntry] = []


def _hash_entry(entry: AuditEntry) -> str:
    payload = entry.model_dump(mode="json", exclude={"audit_hash"})
    blob = json.dumps(payload, sort_keys=True, default=str).encode()
    return hashlib.sha256(blob).hexdigest()[:16]


def record(entry: AuditEntry) -> AuditEntry:
    entry.audit_hash = _hash_entry(entry)
    _LOG.append(entry)
    return entry


def all_entries() -> list[AuditEntry]:
    return list(_LOG)


def clear() -> None:
    _LOG.clear()


def next_transaction_id(brief_id: str) -> str:
    date = datetime.now(timezone.utc).strftime("%Y%m%d")
    seq = sum(1 for e in _LOG if e.buying_brief_id == brief_id) + 1
    return f"PRX-{date}-AX3-{brief_id[-4:]}-{seq}"
