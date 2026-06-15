import os
import random
from typing import List, Dict, Any

try:
    import stripe
except ImportError:
    stripe = None


MOCK_CUSTOMERS = [
    {"id": "cus_mock_001", "email": "alice@acme.com", "name": "Alice Cooper", "plan": "Pro", "amount": 49.0, "currency": "USD", "status": "active"},
    {"id": "cus_mock_002", "email": "bob@globex.com", "name": "Bob Stone", "plan": "Starter", "amount": 19.0, "currency": "USD", "status": "active"},
    {"id": "cus_mock_003", "email": "carol@initech.com", "name": "Carol Diaz", "plan": "Enterprise", "amount": 499.0, "currency": "USD", "status": "active"},
    {"id": "cus_mock_004", "email": "dan@hooli.com", "name": "Dan Egan", "plan": "Pro", "amount": 49.0, "currency": "USD", "status": "past_due"},
    {"id": "cus_mock_005", "email": "eve@piedpiper.com", "name": "Eve Lin", "plan": "Starter", "amount": 19.0, "currency": "USD", "status": "canceled"},
    {"id": "cus_mock_006", "email": "frank@umbrella.com", "name": "Frank Yu", "plan": "Pro", "amount": 49.0, "currency": "USD", "status": "active"},
    {"id": "cus_mock_007", "email": "grace@stark.com", "name": "Grace Hopper", "plan": "Enterprise", "amount": 999.0, "currency": "USD", "status": "active"},
    {"id": "cus_mock_008", "email": "henry@wayne.com", "name": "Henry Cole", "plan": "Pro", "amount": 49.0, "currency": "USD", "status": "active"},
    {"id": "cus_mock_009", "email": "", "name": "Bad Record", "plan": "Pro", "amount": 49.0, "currency": "USD", "status": "active"},
    {"id": "cus_mock_010", "email": "ivy@acme.com", "name": "Ivy Park", "plan": "", "amount": -10.0, "currency": "USD", "status": "active"},
]


def mock_import(limit: int = 50) -> List[Dict[str, Any]]:
    base = list(MOCK_CUSTOMERS)
    while len(base) < limit:
        i = len(base) + 1
        base.append({
            "id": f"cus_mock_{i:03d}",
            "email": f"user{i}@example.com",
            "name": f"User {i}",
            "plan": random.choice(["Starter", "Pro", "Enterprise"]),
            "amount": random.choice([19.0, 49.0, 199.0, 499.0]),
            "currency": "USD",
            "status": "active",
        })
    return base[:limit]


def stripe_import(api_key: str, limit: int = 100) -> List[Dict[str, Any]]:
    if stripe is None:
        raise RuntimeError("stripe package not installed")
    stripe.api_key = api_key
    rows: List[Dict[str, Any]] = []
    customers = stripe.Customer.list(limit=min(limit, 100))
    for c in customers.auto_paging_iter():
        subs = stripe.Subscription.list(customer=c.id, limit=1).data
        plan_name = None
        amount = None
        currency = "USD"
        status = "active"
        if subs:
            sub = subs[0]
            status = sub.status
            try:
                item = sub["items"]["data"][0]
                plan_name = item["price"].get("nickname") or item["price"].get("id")
                amount = (item["price"].get("unit_amount") or 0) / 100.0
                currency = (item["price"].get("currency") or "usd").upper()
            except Exception:
                pass
        rows.append({
            "id": c.id,
            "email": c.email or "",
            "name": c.name or "",
            "plan": plan_name or "",
            "amount": amount if amount is not None else 0,
            "currency": currency,
            "status": status,
        })
        if len(rows) >= limit:
            break
    return rows


def fetch_stripe_or_mock(limit: int = 50) -> (List[Dict[str, Any]], str):
    """Returns (rows, mode) where mode is 'live' or 'mock'."""
    key = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    if key and stripe is not None:
        try:
            return stripe_import(key, limit=limit), "live"
        except Exception:
            pass
    return mock_import(limit=limit), "mock"
