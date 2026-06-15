# FAQ / Troubleshooting

## Why do I see `401 Unauthorized`?

Usually one of these:
- you are not logged in
- the browser session cookie was not set
- the frontend and backend are not using the same localhost origin

## Why does the page look unstyled?

Usually one of these:
- the frontend dev server needs a restart
- the browser needs a hard refresh
- the CSS bundle is stale
- Tailwind/PostCSS is using an old build cache

## Why is `Configure Mapping` empty?

Usually one of these:
- no source has been uploaded yet
- the uploaded CSV does not have headers
- the wrong source was selected

## Why are there no records after migration?

Usually one of these:
- the run was a dry run
- the source rows failed validation
- the mappings do not match the source columns

## How do I test safely?

Use a dry run first and inspect:
- validation counts
- sample errors
- canonical preview
- migration report

## What CSV should I use for a real-world test?

Use the messy examples:
- `app/examples/stripe_messy_large.csv`
- `app/examples/chargebee_messy_large.csv`
- `app/examples/generic_billing_messy_large.csv`

## How do I know the mapping is right?

A good mapping usually produces:
- a valid email for every row
- a plan for each subscription row
- an amount for each contract row
- a currency when applicable

## What should I do if a source import fails?

Check:
- file encoding
- header names
- empty rows
- duplicate emails
- unsupported currency values

## What should I do if a migration fails?

Check:
- logs
- failed record payloads
- report export
- whether the data was validated before the run

## Can I reuse mappings?

Yes. Save them as mapping templates and reuse them for similar customer exports.

