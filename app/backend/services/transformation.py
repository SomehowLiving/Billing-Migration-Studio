from typing import Dict, Any, List

CANONICAL_FIELDS = [
    "customer.email",
    "customer.name",
    "customer.external_id",
    "subscription.plan",
    "subscription.status",
    "subscription.start_date",
    "contract.amount",
    "contract.currency",
    "contract.billing_frequency",
]


def set_nested(obj: Dict[str, Any], path: str, value: Any) -> None:
    parts = path.split(".")
    cur = obj
    for p in parts[:-1]:
        if p not in cur or not isinstance(cur[p], dict):
            cur[p] = {}
        cur = cur[p]
    cur[parts[-1]] = value


def transform_row(row: Dict[str, Any], mappings: Dict[str, str]) -> Dict[str, Any]:
    """Apply field mapping {source_field: canonical_field} to one row."""
    out: Dict[str, Any] = {"customer": {}, "subscription": {}, "contract": {}}
    for src, target in mappings.items():
        if not target:
            continue
        val = row.get(src)
        if val is None:
            continue
        if isinstance(val, str):
            val = val.strip()
            if val == "":
                continue
        if target in ("contract.amount",):
            try:
                val = float(val)
            except (TypeError, ValueError):
                pass
        set_nested(out, target, val)
    return out


def transform_all(rows: List[Dict[str, Any]], mappings: Dict[str, str]) -> List[Dict[str, Any]]:
    return [transform_row(r, mappings) for r in rows]


def auto_suggest_mapping(headers: List[str]) -> Dict[str, str]:
    """Heuristic mapping suggestions from common source field names."""
    rules = [
        ("email", "customer.email"),
        ("mail", "customer.email"),
        ("customer_email", "customer.email"),
        ("name", "customer.name"),
        ("customer_name", "customer.name"),
        ("full_name", "customer.name"),
        ("plan", "subscription.plan"),
        ("subscription_tier", "subscription.plan"),
        ("package", "subscription.plan"),
        ("tier", "subscription.plan"),
        ("status", "subscription.status"),
        ("subscription_status", "subscription.status"),
        ("amount", "contract.amount"),
        ("monthly_fee", "contract.amount"),
        ("price", "contract.amount"),
        ("fee", "contract.amount"),
        ("currency", "contract.currency"),
        ("billing_frequency", "contract.billing_frequency"),
        ("frequency", "contract.billing_frequency"),
        ("external_id", "customer.external_id"),
        ("id", "customer.external_id"),
        ("customer_id", "customer.external_id"),
        ("start_date", "subscription.start_date"),
    ]
    suggestions: Dict[str, str] = {}
    for h in headers:
        norm = h.lower().strip().replace(" ", "_").replace("-", "_")
        for key, target in rules:
            if norm == key or key in norm:
                suggestions[h] = target
                break
    return suggestions
