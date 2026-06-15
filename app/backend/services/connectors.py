import random
from typing import List, Dict, Any

MOCK_CHARGEBEE = [
    {"customer_id": "cb_001", "customer_email": "lara@chargebee-demo.com", "first_name": "Lara", "last_name": "Mendes", "subscription_tier": "Growth", "billing_period": "month", "plan_amount": 79.0, "plan_currency": "USD", "subscription_status": "active"},
    {"customer_id": "cb_002", "customer_email": "marco@chargebee-demo.com", "first_name": "Marco", "last_name": "Singh", "subscription_tier": "Scale", "billing_period": "month", "plan_amount": 249.0, "plan_currency": "USD", "subscription_status": "active"},
    {"customer_id": "cb_003", "customer_email": "nina@chargebee-demo.com", "first_name": "Nina", "last_name": "Park", "subscription_tier": "Starter", "billing_period": "year", "plan_amount": 19.0, "plan_currency": "EUR", "subscription_status": "active"},
    {"customer_id": "cb_004", "customer_email": "omar@chargebee-demo.com", "first_name": "Omar", "last_name": "Yusuf", "subscription_tier": "Growth", "billing_period": "month", "plan_amount": 79.0, "plan_currency": "GBP", "subscription_status": "paused"},
    {"customer_id": "cb_005", "customer_email": "", "first_name": "", "last_name": "Missing", "subscription_tier": "", "billing_period": "month", "plan_amount": 79.0, "plan_currency": "USD", "subscription_status": "active"},
]


def chargebee_mock_import(limit: int = 25) -> List[Dict[str, Any]]:
    base = list(MOCK_CHARGEBEE)
    while len(base) < limit:
        i = len(base) + 1
        base.append({
            "customer_id": f"cb_{i:03d}",
            "customer_email": f"user{i}@chargebee-demo.com",
            "first_name": f"User{i}",
            "last_name": "Doe",
            "subscription_tier": random.choice(["Starter", "Growth", "Scale"]),
            "billing_period": random.choice(["month", "year"]),
            "plan_amount": random.choice([19.0, 79.0, 249.0]),
            "plan_currency": "USD",
            "subscription_status": "active",
        })
    return base[:limit]


MOCK_INTERNAL = [
    {"id": "INT-1001", "mail": "ravi@acmelegacy.io", "full_name": "Ravi Sharma", "package": "Premium", "fee": 149.0, "currency": "USD", "frequency": "monthly", "is_active": True},
    {"id": "INT-1002", "mail": "sasha@acmelegacy.io", "full_name": "Sasha O'Neil", "package": "Standard", "fee": 49.0, "currency": "USD", "frequency": "monthly", "is_active": True},
    {"id": "INT-1003", "mail": "tom@acmelegacy.io", "full_name": "Tom Wright", "package": "Premium", "fee": 149.0, "currency": "USD", "frequency": "monthly", "is_active": False},
    {"id": "INT-1004", "mail": "uma@acmelegacy.io", "full_name": "Uma Patel", "package": "Enterprise", "fee": 999.0, "currency": "USD", "frequency": "yearly", "is_active": True},
]


def internal_mock_import(limit: int = 20) -> List[Dict[str, Any]]:
    base = list(MOCK_INTERNAL)
    while len(base) < limit:
        i = len(base) + 1
        base.append({
            "id": f"INT-{1000+i}",
            "mail": f"user{i}@acmelegacy.io",
            "full_name": f"Legacy User {i}",
            "package": random.choice(["Standard", "Premium", "Enterprise"]),
            "fee": random.choice([49.0, 149.0, 999.0]),
            "currency": "USD",
            "frequency": "monthly",
            "is_active": True,
        })
    return base[:limit]
