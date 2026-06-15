

# Billing Migration Studio

## Overview

Billing Migration Studio is a customer onboarding and billing-data migration platform designed for SaaS implementation teams.

The system imports billing data from heterogeneous sources such as:

* Stripe
* Chargebee
* CSV exports
* Internal billing systems
* Spreadsheet-based workflows

It validates, transforms, normalizes, and migrates billing records into a unified billing schema while generating audit trails and migration reports.

The project simulates the workflow of Forward Deployed Engineers and Implementation Engineers responsible for onboarding enterprise customers onto modern billing platforms.

---

## Quickstart

### Backend

From `app/backend`, run:

```bash
POSTGRES_URL='sqlite:///./billing_studio.db' \
JWT_SECRET='dev-secret' \
ADMIN_EMAIL='admin@example.com' \
ADMIN_PASSWORD='admin123' \
python -m uvicorn server:app --host 127.0.0.1 --port 8001
```

### Frontend

From `app/frontend`, run:

```bash
npm install
npm start
```

If `npm start` complains about missing packages, delete `node_modules` and reinstall, or run `npm install --legacy-peer-deps` in this repo snapshot.

### API checks

Once the backend is up, verify it with:

```bash
curl http://127.0.0.1:8001/api/
curl -c /tmp/billing.cookies -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  http://127.0.0.1:8001/api/auth/login
curl -b /tmp/billing.cookies http://127.0.0.1:8001/api/auth/me
```

### CSV examples

Use these sample files when testing `Configure Mapping`:

* [`app/examples/stripe_sample.csv`](app/examples/stripe_sample.csv)
* [`app/examples/chargebee_sample.csv`](app/examples/chargebee_sample.csv)
* [`app/examples/generic_billing_sample.csv`](app/examples/generic_billing_sample.csv)
* [`app/examples/stripe_messy_large.csv`](app/examples/stripe_messy_large.csv)
* [`app/examples/chargebee_messy_large.csv`](app/examples/chargebee_messy_large.csv)
* [`app/examples/generic_billing_messy_large.csv`](app/examples/generic_billing_messy_large.csv)

Each file already includes the headers the mapper can infer:

* `email` or `customer_email` maps to `customer.email`
* `name`, `first_name` + `last_name`, or `customer_name` maps to `customer.name`
* `plan` or `subscription_tier` maps to `subscription.plan`
* `amount`, `plan_amount`, or `monthly_fee` maps to `contract.amount`
* `currency` or `plan_currency` maps to `contract.currency`
* `status` or `subscription_status` maps to `subscription.status`
* `external_id` or `customer_id` maps to `customer.external_id`

---

# Problem Statement

When a customer adopts a new billing platform, their data rarely arrives in a consistent format.

Examples:

### Customer A

```csv
email,plan,amount
john@gmail.com,Pro,29
```

### Customer B

```csv
customer_email,subscription_tier,monthly_fee
john@gmail.com,Pro,29
```

### Customer C

```json
{
  "subscriber": {
    "mail": "john@gmail.com",
    "package": "Pro"
  }
}
```

Although these represent the same information, the structure differs.

Implementation teams must:

1. Understand source schemas
2. Map fields
3. Validate data quality
4. Detect inconsistencies
5. Migrate records
6. Generate migration reports

Billing Migration Studio automates this workflow.

---

# Core Features

## 1. Multi-Source Data Ingestion

### CSV Upload

Supports:

```text
customers.csv
subscriptions.csv
contracts.csv
usage.csv
```

Capabilities:

* delimiter detection
* encoding detection
* schema inference
* preview before import

Inspired by:

```text
csv-to-github
clearpass-csv2api
```

---

## 2. Stripe Data Import

Import:

```text
Customers
Subscriptions
Invoices
Products
Prices
```

via Stripe APIs.

Capabilities:

```text
Incremental sync
Full sync
Pagination handling
Retry support
```

Inspired by:

```text
friendly-stripe-sync
stripe-account-migration
```

---

## 3. Schema Mapping Engine

Maps arbitrary customer fields into a canonical schema.

Example:

```text
customer_email
    →
customer.email

monthly_fee
    →
contract.amount

subscription_tier
    →
subscription.plan
```

Supports:

```text
Manual mapping
Saved mapping templates
Reusable migration profiles
```

---

## 4. Validation Engine

Detects migration issues before import.

Checks:

### Customer

```text
Missing email
Duplicate email
Invalid email format
```

### Subscription

```text
Missing plan
Missing customer reference
Invalid dates
```

### Billing

```text
Negative amounts
Unsupported currencies
Null contract values
```

Output:

```json
{
  "valid": 240,
  "invalid": 17
}
```

---

## 5. Transformation Engine

Converts source schemas into canonical billing objects.

Input:

```csv
Email,Plan,Monthly Fee
```

Output:

```json
{
  "customer": {
    "email": "john@gmail.com"
  },
  "subscription": {
    "plan": "Pro"
  },
  "contract": {
    "amount": 29
  }
}
```

---

## 6. Migration Runner

Executes migrations.

Supports:

### Dry Run

```text
Validate only
No writes
Generate report
```

### Actual Run

```text
Write records
Track progress
Store logs
```

Capabilities:

```text
Batch processing
Retry failed records
Rollback support
Migration status tracking
```

Inspired by:

```text
stripe-migration
stripe-account-migration
```

---

## 7. Billing API Connector

Imports transformed records through APIs.

Endpoints:

```http
POST /customers

POST /subscriptions

POST /contracts

POST /usage
```

Capabilities:

```text
Rate limiting
Retries
Failure handling
```

Inspired by:

```text
clearpass-csv2api
```

---

## 8. Audit Trail System

Every migration action is recorded.

Example:

```text
Migration #42

Imported:
  120 customers

Failed:
  4 customers

Reason:
  Duplicate email
```

Stored in:

```text
migration_runs
migration_records
migration_logs
```

Inspired by:

```text
stripe-migration
```

---

## 9. Reporting System

Generated after every migration.

Includes:

```text
Total records
Successful imports
Failed imports
Validation failures
Duration
Failure reasons
```

Export formats:

```text
CSV
JSON
PDF
```

---

# Architecture

```text
┌─────────────────────┐
│   Data Sources      │
│                     │
│ Stripe              │
│ Chargebee           │
│ CSV Files           │
│ Internal Systems    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Ingestion Layer     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Schema Mapper       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Validation Engine   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Transformation      │
│ Engine              │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Migration Runner    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Billing APIs        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ PostgreSQL          │
│ Audit Logs          │
│ Reports             │
└─────────────────────┘
```

---

# Database Schema

## customers

```sql
id
email
name
external_id
source_system
created_at
```

---

## subscriptions

```sql
id
customer_id
plan_name
status
start_date
end_date
```

---

## contracts

```sql
id
customer_id
amount
currency
billing_frequency
```

---

## migration_runs

```sql
id
source_type
status
started_at
completed_at
total_records
successful_records
failed_records
```

---

## migration_records

```sql
id
migration_run_id
record_type
source_id
status
error_message
```

---

# Tech Stack

## Backend

```text
Python
FastAPI
Pandas
SQLAlchemy
PostgreSQL
Celery
Redis
```

## Frontend

```text
React
TypeScript
Tailwind
TanStack Query
```

## Infrastructure

```text
Docker
Docker Compose
GitHub Actions
```
