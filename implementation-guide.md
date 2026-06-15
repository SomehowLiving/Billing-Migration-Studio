# Implementation Guide

This guide is for technical teams, implementation consultants, and services teams.

## Product Model

Billing Migration Studio is organized around:
- sources
- mappings
- validations
- migrations
- onboarding projects

## Canonical Fields

Map your source columns into:
- `customer.email`
- `customer.name`
- `customer.external_id`
- `subscription.plan`
- `subscription.status`
- `subscription.start_date`
- `contract.amount`
- `contract.currency`
- `contract.billing_frequency`

## Source Import Options

### CSV Upload
- Best for exports from existing systems
- Auto-detects delimiter and encoding
- Infers schema and previews rows

### Stripe Import
- Imports customer/subscription-like records
- Uses live Stripe if configured
- Falls back to mock data if not

### Chargebee Import
- Uses mock Chargebee-style data in this repo
- Good for testing subscription-heavy workflows

### Internal Import
- Useful for legacy and custom billing systems
- Good for mixed naming conventions

## Mapping Strategy

When mapping fields:
- prioritize email and customer name first
- map plan and amount next
- map currency and status when present
- map external IDs if you need identity reconciliation

## Validation Strategy

The platform checks for:
- missing email
- invalid email format
- missing plan
- negative amounts
- unsupported currencies
- duplicate emails

## Migration Modes

### Dry Run
Use for:
- first-pass validation
- stakeholder review
- data quality checks

### Actual
Use for:
- writing records
- post-approval migrations
- customer go-live

## Recommended Process

1. Import a sample source.
2. Confirm inferred headers.
3. Auto-suggest mappings.
4. Fix any unmapped or ambiguous columns.
5. Run validation.
6. Check the preview and errors.
7. Run a dry migration.
8. Review records, logs, and report.
9. Run the actual migration only after signoff.

## Onboarding Projects

Use onboarding projects to group:
- sources
- mapping templates
- migration runs

They are best for:
- customer-facing status pages
- internal delivery tracking
- handoff from implementation to support

## Example CSV Headers

Common headers that work well:
- `email`
- `name`
- `plan`
- `amount`
- `currency`
- `status`
- `external_id`

Common alternate headers:
- `customer_email`
- `customer_name`
- `subscription_tier`
- `monthly_fee`
- `plan_amount`
- `plan_currency`
- `subscription_status`
- `customer_id`

