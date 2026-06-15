import re
from typing import List, Dict, Any, Tuple

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
SUPPORTED_CURRENCIES = {"USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY"}


def validate_record(record: Dict[str, Any]) -> List[str]:
    """Return a list of error messages for a canonical record."""
    errors: List[str] = []
    customer = record.get("customer", {}) or {}
    sub = record.get("subscription", {}) or {}
    contract = record.get("contract", {}) or {}

    email = (customer.get("email") or "").strip().lower()
    if not email:
        errors.append("Missing email")
    elif not EMAIL_RE.match(email):
        errors.append("Invalid email format")

    if not (sub.get("plan") or "").strip():
        errors.append("Missing plan")

    amount = contract.get("amount")
    if amount is not None and amount != "":
        try:
            amount_f = float(amount)
            if amount_f < 0:
                errors.append("Negative amount")
        except (TypeError, ValueError):
            errors.append("Invalid amount value")

    currency = (contract.get("currency") or "USD").upper()
    if currency and currency not in SUPPORTED_CURRENCIES:
        errors.append(f"Unsupported currency: {currency}")

    return errors


def validate_all(records: List[Dict[str, Any]]) -> Tuple[int, int, List[Dict[str, Any]]]:
    valid = 0
    invalid = 0
    detailed = []
    seen_emails = set()
    for idx, rec in enumerate(records):
        errs = validate_record(rec)
        email = ((rec.get("customer") or {}).get("email") or "").strip().lower()
        if email and email in seen_emails:
            errs.append("Duplicate email")
        if email:
            seen_emails.add(email)
        if errs:
            invalid += 1
        else:
            valid += 1
        detailed.append({"index": idx, "errors": errs, "record": rec})
    return valid, invalid, detailed
