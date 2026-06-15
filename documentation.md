# Billing Migration Studio Documentation

This document is the main hub. For a cleaner customer-facing path, see:
- [`getting-started.md`](getting-started.md)
- [`implementation-guide.md`](implementation-guide.md)
- [`faq-troubleshooting.md`](faq-troubleshooting.md)

## What This Product Is

Billing Migration Studio is a billing-data onboarding and migration platform for companies moving customer, subscription, and contract data from one system to another.

It helps teams:
- ingest data from CSV, Stripe, Chargebee, and internal systems
- map source fields to a canonical billing schema
- validate records before import
- run dry-run or actual migrations
- review audit logs, reports, and onboarding progress

## Who This Is For

### Product Teams
Use Billing Migration Studio to:
- understand what data a customer will provide
- review schema mappings before go-live
- track migration progress across onboarding projects
- share a customer-facing onboarding page with stakeholders

### Technical Teams
Use Billing Migration Studio to:
- upload or import source data
- define field mappings
- validate data quality
- run migrations safely in dry-run mode first
- inspect logs, records, and reports after a run

### Implementation / Services Teams
Use Billing Migration Studio to:
- onboard a new customer faster
- see missing fields, bad emails, duplicate rows, and unsupported values
- keep a clean audit trail for each migration
- reuse mapping templates for repeatable imports

## Core Concepts

### Data Source
A source is the raw data imported into the platform.

Supported source types:
- CSV upload
- Stripe import
- Chargebee import
- internal billing import

### Canonical Schema
The platform maps all source data into a shared structure:
- `customer.email`
- `customer.name`
- `customer.external_id`
- `subscription.plan`
- `subscription.status`
- `subscription.start_date`
- `contract.amount`
- `contract.currency`
- `contract.billing_frequency`

### Mapping Template
A saved mapping template stores field-to-field mappings so the same customer format can be reused later.

### Migration Run
A migration run is an execution of mappings against one source.

Run modes:
- `dry_run`: validate and report only
- `actual`: write records

### Onboarding Project
An onboarding project groups sources, mappings, and runs into one customer-specific view.

## Typical Workflow

1. Upload or import a source
2. Review inferred headers and schema
3. Map source fields to the canonical schema
4. Run validation
5. Run a dry migration
6. Review records, logs, and report
7. Run the actual migration when ready
8. Create or update the onboarding project
9. Share the onboarding page with the customer

## Running The Product Locally

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

If dependency resolution is stale in your workspace, use:

```bash
npm install --legacy-peer-deps
```

## Login

The backend seeds an admin account on startup.

Default credentials:
- email: `admin@example.com`
- password: `admin123`

## API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/auth/me`

### Schema
- `GET /api/schema/canonical`

### Sources
- `POST /api/sources/csv`
- `POST /api/sources/stripe`
- `POST /api/sources/chargebee`
- `POST /api/sources/internal`
- `GET /api/sources`
- `GET /api/sources/{source_id}`
- `DELETE /api/sources/{source_id}`

### Mappings
- `GET /api/mappings`
- `POST /api/mappings`
- `DELETE /api/mappings/{template_id}`

### Validation
- `POST /api/validate`

### Migrations
- `POST /api/migrations`
- `GET /api/migrations`
- `GET /api/migrations/{run_id}`
- `GET /api/migrations/{run_id}/records`
- `GET /api/migrations/{run_id}/logs`
- `POST /api/migrations/{run_id}/retry`
- `POST /api/migrations/{run_id}/rollback`
- `GET /api/migrations/{run_id}/report?format=json`
- `GET /api/migrations/{run_id}/report?format=csv`

### Onboarding
- `POST /api/onboarding/projects`
- `GET /api/onboarding/projects`
- `GET /api/onboarding/projects/{project_id}`
- `PUT /api/onboarding/projects/{project_id}`
- `DELETE /api/onboarding/projects/{project_id}`
- `GET /api/onboarding/public/{share_token}`

### Dashboard
- `GET /api/dashboard/stats`

## CSV Format Guidance

The mapper works best when the CSV includes clear headers such as:
- `email`
- `name`
- `plan`
- `amount`
- `currency`
- `status`
- `external_id`

It can also infer common variants:
- `customer_email`
- `customer_name`
- `subscription_tier`
- `monthly_fee`
- `plan_amount`
- `plan_currency`
- `subscription_status`
- `customer_id`

## Test Files

Use these files to exercise the product:
- `app/examples/stripe_sample.csv`
- `app/examples/chargebee_sample.csv`
- `app/examples/generic_billing_sample.csv`
- `app/examples/stripe_messy_large.csv`
- `app/examples/chargebee_messy_large.csv`
- `app/examples/generic_billing_messy_large.csv`

## What To Check After A Migration

Look for:
- total records processed
- valid vs invalid validation results
- successful vs failed migration rows
- logs for transformation or write failures
- report export in JSON or CSV
- rollback behavior if the run was actual

## Common Issues

### 401 Unauthorized
Usually means:
- you are not logged in
- the browser session cookie is missing
- the frontend and backend are not using matching localhost origins

### Unstyled Page
Usually means:
- the frontend dev server needs a restart
- the browser needs a hard refresh
- the Tailwind/PostCSS pipeline is stale

### Empty Mapping Screen
Usually means:
- the source was not uploaded or imported yet
- the source has no detectable headers

## Recommended Demo Flow

1. Log in with the seeded admin account
2. Upload `app/examples/stripe_sample.csv`
3. Open `Configure Mapping`
4. Use auto-suggest or map fields manually
5. Run validation
6. Run a dry migration
7. Review the report
8. Repeat with the messy large files
9. Create an onboarding project and share it

## Notes For Teams

- Keep CSV column names explicit.
- Map only the fields you actually have.
- Use dry runs before actual migrations.
- Save templates for repeatable customer formats.
- Share onboarding projects with product and implementation stakeholders.
