# Persuasion Analytics — Ads Dashboard (reference implementation)

A Meta ads reporting dashboard that marries ad performance data with the copy
and creative assets behind each ad. This repo is the **reference
implementation on dummy data** — the production version lives inside the
Meta-approved destination app, which implements the two provider interfaces
against the live Meta Marketing API and Stripe.

## The idea

Every ad is the join of one **copy asset** (C1, C2, …) and one **creative
asset** (V1… videos, I1… statics). Because assets are first-class records,
performance can be pivoted by asset — "C3 ran across 4 creatives, which
pairing won?" — and asset metadata (copy text, image prompts, video scripts,
notes) makes creatives legible to the Persuasion Analytics engine.

## Architecture in 30 seconds

- `lib/types.ts` — the schema (5 entities). Ad labels like `001 · V4-C3` are
  always derived, never stored.
- `lib/providers/types.ts` — **the handoff seam**: `AdsProvider` (Meta) and
  `RevenueProvider` (Stripe). This repo ships a seed implementation reading
  `data/seed.json`; the destination app implements the same interfaces live.
- `lib/metrics.ts` — all aggregation + derived metrics (CTR, CPA, ROAS, hook
  rate…). Computed, never stored. Revenue source (stripe / meta-attributed /
  manual) is resolved per query and labeled in the UI, never silently mixed.
- `lib/dates.ts` — range presets, full-week/month/quarter logic (weeks are
  Mon–Sun).
- `docs/meta-field-map.md` — field-by-field mapping from seed data to the
  real Meta / Stripe fields.

## Run it

```
npm install
node scripts/generate-seed.mjs   # regenerate dummy data (deterministic)
npm run dev
```

To demo with real numbers, replace `data/seed.json` with an export matching
`SeedDataset` in `lib/types.ts` — no code changes.

## Handing off?

Start with **`docs/handoff-guide.md`** — the swap-vs-keep map, integration
checklist, and the invariants that must survive the port. Then
`docs/meta-field-map.md` for the field-by-field Meta/Stripe mapping.

## Status

All four phases shipped:

1. ✅ Schema, providers, seed data, main dashboard (tiles, WoW/MoM/QoQ
   quick-compares, customizable ads table, date ranges)
2. ✅ Trends & cohorts (week/month/quarter bucketing, day-of-week
   breakdown, charts, cohort table)
3. ✅ Asset registry + copy × creative pairing matrix + edit drawer
4. ✅ Handoff package (`docs/handoff-guide.md`)
