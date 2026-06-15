# Getting Started

Billing Migration Studio helps teams move billing data from Stripe, Chargebee, CSV exports, and internal systems into a canonical billing schema.

## What You Need

- A browser for the frontend
- Access to the backend API
- A CSV export or source system to test with
- Permission to run migrations in your environment

## Quick Start

1. Start the backend.
2. Start the frontend.
3. Log in with the seeded admin account.
4. Upload a CSV or import a source.
5. Map source fields to canonical fields.
6. Run validation.
7. Run a dry migration first.
8. Review the report and logs.

## Local Run

### Backend

From `app/backend`:

```bash
POSTGRES_URL='sqlite:///./billing_studio.db' \
JWT_SECRET='dev-secret' \
ADMIN_EMAIL='admin@example.com' \
ADMIN_PASSWORD='admin123' \
python -m uvicorn server:app --host 127.0.0.1 --port 8001
```

### Frontend

From `app/frontend`:

```bash
npm install
npm start
```

If package resolution is stale:

```bash
npm install --legacy-peer-deps
```

## Login

Default seeded credentials:
- Email: `admin@example.com`
- Password: `admin123`

## Best First Test

Use one of these files:
- `app/examples/stripe_sample.csv`
- `app/examples/chargebee_sample.csv`
- `app/examples/generic_billing_sample.csv`

If you want a more realistic import test, use:
- `app/examples/stripe_messy_large.csv`
- `app/examples/chargebee_messy_large.csv`
- `app/examples/generic_billing_messy_large.csv`

