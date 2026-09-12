# Meet Metric

An accessible, no-build frontend prototype for estimating the Australian population that meets a set of dating preferences. It deliberately separates **ABS-backed inputs** from **adjusted** and **modelled** layers, rather than presenting a spurious exact number.

Open `index.html` in a browser, or serve it locally:

```sh
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## What is implemented

- Minimal preference form: gender, city, age, annual personal-income threshold, height, background/ancestry proxy and likely-unpartnered proxy.
- Result calculation with an inspectable, per-filter trail. “ABS base”, “Adjusted” and “Modelled” are separately labelled.
- A live, best-effort request to the [ABS SDMX Data API](https://www.abs.gov.au/statistics/application-programming-interfaces-apis/data-api-user-guide), with a clearly labelled versioned 2021 snapshot fallback.
- Local-only anonymous preference-event count for the prototype; no personal data leaves the browser.
- Preview of the future reciprocal-interest flow, with explicit disclosure that it has no real mutual-interest result yet.
- Responsive, keyboard-accessible UI and method notes.

## Product and data plan

### Phase 1 — Honest population estimator (this prototype)

1. Keep an audited ABS source snapshot for city population, age, sex, ancestry/background and relationship-status inputs.
2. Calculate from a base population downward. Mark every multiplier as `observed`, `adjusted`, or `modelled` in both the UI and calculation log.
3. Keep this strictly a population estimate: it must never imply a count of app users, available people, compatible people, or likely matches.

### Phase 2 — Production ABS ingestion

1. Add a server-side ABS SDMX adapter. Start with the `ABS,ERP_ASGS2021,1.0.0` population-by-age-and-sex dataflow, then call known, pinned Census dataflows (not a broad browser fetch). Parse labels/codes, cache results, retain source release/version/date, and return a compact normalised payload.
2. Use compatible Census tables for city × age × sex, ancestry/country-of-birth proxy, income bands and relationship-status wherever the table actually supports the intersection.
3. Add data tests: positive integer counts, share sums, valid periods, stale-data warning, row-level provenance and snapshot comparisons on refresh.
4. Move city mappings from this illustrative frontend snapshot to an ABS ASGS geography map. Decide explicitly whether “city” means GCCSA, Greater Capital City Statistical Area, or another geography.

### Phase 3 — Intersection model

1. Maintain a feature registry containing the source, time period, geography, permitted joins, model version and uncertainty for every filter.
2. Prefer published cross-tabs first. For unavailable intersections, fit a calibrated Bayesian/raking model to public marginal tables; report uncertainty intervals, not just a point estimate.
3. Do **not** infer sensitive characteristics from another characteristic. “Ethnicity” should be framed as an optional self-described background preference and supported only by clearly named ABS ancestry/country-of-birth proxies.
4. Treat height and fine-grained income as external, labelled models until authoritative matching data are available. Recalibrate and document them separately.
5. Publish a methodology page with formula versions and reproducible source extracts.

### Phase 4 — Opt-in preference aggregation and mutual potential

1. Use a separate consent screen before collecting any preference or self-description data. Store only the minimum data needed in coarse bins; never expose individual submissions.
2. Use secure server-side aggregation with k-anonymity thresholds, rate limits, deletion/retention controls, encrypted storage, audit logs and privacy review. A user should be able to use the population estimator without contributing data.
3. Do not calculate a reciprocal segment until sufficiently large, diverse cohorts meet a published disclosure threshold. Suppress small cells and return a broad range with uncertainty.
4. Before launch: Privacy Impact Assessment, discrimination/bias review, accessibility testing, security review, terms/privacy policy, and legal advice relevant to Australian privacy and anti-discrimination law.

## Important limits

The UI currently contains rounded, illustrative city inputs and distributional models so it can work offline. It is not yet a production ABS data pipeline. ABS tables do not directly measure dating availability, attraction, sexuality, adult height, or an exact ethnicity category. Results are directional estimates, not a dating-pool count or compatibility score.

## Key source references

- [ABS Data API user guide](https://www.abs.gov.au/statistics/application-programming-interfaces-apis/data-api-user-guide)
- [ABS 2021 Census Dictionary](https://www.abs.gov.au/census/guide-census-data/census-dictionary/2021)
- [ABS guidance on interpreting SDMX API data](https://www.abs.gov.au/statistics/application-programming-interfaces-apis/data-api-user-guide/understanding-sdmx-data)
