# SeeFish

SeeFish is an Australian dating-pool explorer for a curious five-minute visit. Pick a type on the first page, then add optional details on About you for a personalized mutual-interest scenario, including same-sex pairings. Eligible visitors discover a personal Instagram invitation from the creator. The experience uses a warm plum night palette, a glowing particle map and a scrolling mobile layout with larger touch controls.

## Run

```sh
npm install
npm run dev
```

This starts the UI at `http://127.0.0.1:5173`. The calculation works locally; production analytics and the private dashboard require the Worker, D1, and the `ADMIN_PASSWORD` Worker secret.

For the complete app with a local database:

```sh
npm run build
npm run db:local
npm run dev:worker
```

Open the Worker URL printed in the terminal (normally `http://localhost:8787`). Use this URL for the full submission flow so requests are same-origin.

## Check

```sh
npm run check
npm test
npm run test:e2e
npm run build
```

Browser tests use an installed Google Chrome. The model and Worker tests cover range monotonicity, income bands, introduction eligibility, strict event validation, append-only capture, and cross-origin protection. Browser checks cover the two-page desktop/mobile flow, local profile privacy, the personal introduction and particle interaction.

## Data

Population calculations use the ABS 2021 Census G17 age × sex × income tables, G04 single ages, G08 ancestry margins, and NHS 2022 height means. All calculations run against the checked-in snapshot; no live ABS availability is required. Rebuild using `sh scripts/rebuild-abs-model.sh`.

See [data coverage](docs/data-coverage.md) for population assumptions and [dating research](docs/dating-research.md) for the About you formulas, research and limitations. About you combines the selected demographic pool with ABS 2022 sexual-orientation proxies and explicitly assumed preference weights for age, relative height, income, shared ancestry and geography. Its baseline and sensitivity range are illustrative, not a calibrated attraction probability or confidence interval. The optional "About you" profile remains on the device. Production analytics record page visits, a persistent random browser ID, IP/network metadata, device context, and type filters submitted when revealing a result. Raw records expire after 90 days and are visible only through the authenticated `/admin` dashboard. Population counts are based on 2021, not projections to the present.

The particle map is a scaled illustration. Its points are not individual people or residential locations. Camera zoom, cursor currents and click ripples animate the field; a coastline fades in only below a 2% match share. Reduced motion and a Canvas fallback are supported.

## Deploy

The Cloudflare build command is `npm run build`; the deploy command is `npx wrangler deploy`.

The production Worker is bound to the `seefish-analytics` D1 database in Cloudflare's Oceania region. Visit `/admin` for the private dashboard, use `npm run db:events` to inspect recent production reveals, or `npm run db:insights` for a daily city/gender summary. See [the deployment guide](docs/deployment.md) for the schema, authentication model, queries, and deployment workflow.
