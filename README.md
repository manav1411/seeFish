# SeeFish

A compact Australian dating-pool explorer. React + TypeScript, a monochrome Three.js particle map, reproducible ABS population data, and a Cloudflare Worker API with D1 submission storage.

## Run

```sh
npm install
npm run dev
```

This starts the UI at `http://127.0.0.1:5173`. The calculation works locally; submission saving requires the Worker and database.

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

Browser tests use an installed Google Chrome. The model and Worker tests cover range monotonicity, income bands, incomplete profiles, disclosure validation, idempotent saving, deletion, and sparse cohorts. Browser checks cover the single-screen desktop/mobile layout and the full three-step flow.

## Data

Population calculations use the ABS 2021 Census G17 age × sex × income tables, G04 single ages, G08 ancestry margins, and NHS 2022 height means. All calculations run against the checked-in snapshot; no live ABS availability is required. Rebuild using `sh scripts/rebuild-abs-model.sh`.

See [data coverage](docs/data-coverage.md) for sources, assumptions, and unsupported intersections. Results count demographic fit, not currently available daters. Unknown reciprocal preferences are explicitly shown as user-selected scenarios. Counts are based on 2021, not projections to the present.

The particle map is a scaled illustration. Its points are not individual people or residential locations. It uses a simplified geographic coastline, smooth camera zoom, cursor displacement, and a stable subset of illuminated points that shrinks as preferences narrow. A Canvas fallback is available when WebGL cannot be created.

## Deploy

The Cloudflare build command is `npm run build`; the deploy command is `npx wrangler deploy`.

The checked-in production configuration serves the app and calculations. **Production submissions require a real D1 binding and migrations.** Configure these using [the deployment guide](docs/deployment.md). No production database ID or credential is invented or included in this repository. Until storage is configured, the result remains available and the interface truthfully reports that a contribution could not be saved.

Reciprocal community output is disabled by default until sufficient relevant responses and the documented release checks are in place. The complete scenario experience works immediately.
