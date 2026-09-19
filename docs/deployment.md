# Deploying SeeFish

The checked-in configuration can build and serve the static app and calculation API without credentials. Contribution endpoints deliberately return `503 Contribution capture is currently unavailable` until a D1 binding is configured; they never report a save when storage is absent.

## Run locally with D1

The separate `wrangler.local.jsonc` uses Wrangler's local-only `database_id: "local"`; it is never used for production deployment. Build the static app, apply the migration to the local database, then start the Worker:

```sh
npm run build
npx wrangler d1 migrations apply seefish-local --local --config wrangler.local.jsonc
npx wrangler dev --config wrangler.local.jsonc
```

Open the URL printed by Wrangler so browser writes carry the matching `Origin`. Local D1 state lives in Wrangler's development state directory. Delete that local state only when you intentionally want a fresh synthetic database.

## Provision production infrastructure

1. Run `npm run build` and `npx wrangler deploy` to deploy the stateless site first.
2. Create a production database with `npx wrangler d1 create seefish-contributions`. Add the returned `database_id` under a `d1_databases` entry in `wrangler.jsonc` with `binding: "DB"` and `database_name: "seefish-contributions"`. No placeholder ID is committed because Wrangler rejects it.
3. Apply the schema with `npx wrangler d1 migrations apply seefish-contributions --remote`.
4. Create a Cloudflare Workers Rate Limiting binding named `RATE_LIMITER` in the dashboard or configuration for production. Without it, the Worker uses a clearly limited per-isolate, in-memory fallback; that fallback is useful for local development and is not adequate abuse protection for public capture.
5. Keep `COMMUNITY_RECIPROCITY_ENABLED` set to `false` until privacy review, consent review, cohort-query auditing, monitoring, and abuse controls are complete. Enabling it only permits community output after 50 jointly evaluable paired contributions. It does not make the voluntary sample representative of Australia.

The browser must generate at least 32 random bytes using `crypto.getRandomValues`, encode them as hexadecimal or unpadded base64url, retain the capability locally, and send it as `Authorization: Bearer <capability>`. The database stores only its SHA-256 hash. Losing the capability means the row can no longer be updated or deleted by that browser.

Writes require an `Origin` header exactly matching the request URL origin, the current disclosure version, and `acknowledged: true`. Do not proxy these endpoints through a different public origin without updating that design deliberately.

The daily scheduled handler deletes expired row-level contributions after 365 days. Cloudflare backup retention and deletion propagation must be configured and documented against the actual account policy before enabling capture. D1's Oceania location hint may be selected when creating the database, but it is not an Australia-only data residency guarantee.

Use separate D1 databases for preview and production. Populate preview only with synthetic contributions. The Worker does not log raw request bodies, preference values, profiles, or capabilities; platform-level logging and analytics should be reviewed before production.

Operational readiness requires the D1 binding and migrated schema, the rate-limit binding, same-origin hosting, a verified privacy/disclosure review, backup deletion policy, production monitoring based only on status/latency, and a successful create-update-profile-delete smoke test. Static deployment alone is intentionally not described as capture-ready.
