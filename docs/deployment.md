# Deploying SeeFish

SeeFish records page views and reveal clicks for product analytics. Records include a random persistent browser ID, per-tab session ID, IP address, User-Agent, referrer, viewport, client language/timezone, Cloudflare's approximate network location, and the selected type filters/result for reveal clicks. The optional **About you** profile is not transmitted.

The current production Worker is bound to `seefish-analytics` in Cloudflare's Oceania region. Visit `https://seefish.manavbdodia.workers.dev/admin` for the private dashboard. From the project directory, `npm run db:events` shows recent reveals and `npm run db:insights` shows the daily summary.

The public analytics endpoints validate every field, require same-origin browser requests, and use Cloudflare's native rate-limit binding. Admin login is separately limited to five attempts per minute per request key. Raw page views and reveals expire after 90 days via the daily Worker cron. Because IP addresses and persistent browser IDs can be personal information, production collection must be accurately disclosed and reviewed against applicable privacy obligations.

## Admin authentication

`/admin` never contains or receives a compiled-in password. `ADMIN_PASSWORD` is an encrypted Cloudflare Worker secret and is submitted only to the same-origin login endpoint. A separate random `ADMIN_SESSION_SECRET` signs the 12-hour, HttpOnly, SameSite=Strict cookie; analytics API responses are unavailable without a valid cookie.

Set or rotate the password interactively so it never appears in the repository or shell history:

```sh
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_SESSION_SECRET
```

The secret name is declared as required in `wrangler.jsonc`, but its value exists only in Cloudflare. For local development, provide a disposable value through an ignored `.dev.vars` file or Wrangler's `--var` option; never reuse the production password in a committed file.

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

## Recreate production D1

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

4. Keep the checked-in `RATE_LIMITER` and `ADMIN_RATE_LIMITER` bindings configured. Their namespace IDs are account-local integers and their limits are defined in `wrangler.jsonc`.

These steps are only needed when recreating the database or setting up another Cloudflare account. Use a separate database for preview deployments and synthetic data. Production writes return `503` when the `DB` binding is missing or migrations have not been applied; this does not block the user-facing result.

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
- New identifiable analytics records expire 90 days after capture, and the scheduled Worker deletes expired rows daily.
- The existing `contributions` table from migration `0001` is retained for safe upgrade compatibility but receives no new frontend data.
- D1 backup retention and deletion propagation depend on the Cloudflare account configuration and should be reviewed separately.
