# Deploying SeeFish

SeeFish records one anonymous `reveal_events` row whenever a visitor clicks **See how many are into you**. The row contains the selected type filters, the calculated estimate, the model version, and a server-generated UTC timestamp. It does not store an IP address, cookie, browser token, User-Agent, referrer, or the optional **About you** profile.

The endpoint accepts only the `preferences` object, validates every field, requires a same-origin browser request, and is rate-limited. Events expire after 365 days via the daily Worker cron. Cloudflare may still process request metadata outside this application database, so review account logging and applicable privacy obligations before production use.

## Run and inspect locally

Build the app, apply both migrations, and start the Worker:

```sh
npm run build
npm run db:local
npm run dev:worker
```

Open the Worker URL (normally `http://localhost:8787`), choose filters, and click the CTA. Then inspect recent events:

```sh
npx wrangler d1 execute seefish-local --local --config wrangler.local.jsonc --command "SELECT id, datetime(clicked_at, 'unixepoch') AS clicked_at_utc, gender, city, age_min, age_max, height_min, height_max, income_min, income_max, backgrounds_json, estimated_matches, eligible_population, match_share, model_version FROM reveal_events ORDER BY clicked_at DESC LIMIT 100"
```

## Provision production D1

1. Create the database:

   ```sh
   npx wrangler d1 create seefish-analytics
   ```

2. Copy the returned `database_id` into `wrangler.jsonc`:

   ```jsonc
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "seefish-analytics",
       "database_id": "PASTE_THE_RETURNED_ID_HERE",
       "migrations_dir": "migrations"
     }
   ]
   ```

3. Apply the migrations and deploy:

   ```sh
   npx wrangler d1 migrations apply seefish-analytics --remote
   npm run deploy
   ```

4. Configure a Workers Rate Limiting binding named `RATE_LIMITER`. Without one, the Worker uses a per-isolate in-memory fallback suitable for development, not robust public abuse protection.

Use a separate database for preview deployments and synthetic data. Production writes will return `503` until the `DB` binding exists and migrations have been applied; this does not block the user-facing result.

## View production events

The Cloudflare dashboard exposes the same data under **Storage & Databases → D1 → seefish-analytics → Console**. From the CLI:

```sh
npx wrangler d1 execute seefish-analytics --remote --command "SELECT id, datetime(clicked_at, 'unixepoch') AS clicked_at_utc, gender, city, age_min, age_max, height_min, height_max, income_min, income_max, backgrounds_json, estimated_matches, eligible_population, match_share, model_version FROM reveal_events ORDER BY clicked_at DESC LIMIT 100"
```

For a quick summary by day, city, and selected gender:

```sh
npx wrangler d1 execute seefish-analytics --remote --command "SELECT date(clicked_at, 'unixepoch') AS day_utc, city, gender, COUNT(*) AS clicks, ROUND(AVG(estimated_matches)) AS average_matches FROM reveal_events GROUP BY day_utc, city, gender ORDER BY day_utc DESC, clicks DESC"
```

These commands follow Cloudflare's current [`d1 migrations apply`](https://developers.cloudflare.com/d1/wrangler-commands/#d1-migrations-apply) and [`d1 execute`](https://developers.cloudflare.com/d1/wrangler-commands/#d1-execute) interfaces.

## Data lifecycle notes

- `clicked_at` comes from D1's `unixepoch()` default, not the visitor's clock.
- `expires_at` is set to one year after capture, and the scheduled Worker deletes expired rows daily.
- The existing `contributions` table from migration `0001` is retained for safe upgrade compatibility but receives no new frontend data.
- D1 backup retention and deletion propagation depend on the Cloudflare account configuration and should be reviewed separately.
