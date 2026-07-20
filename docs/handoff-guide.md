# Handoff guide: absorbing this dashboard into the production app

Audience: the developer of the Meta-approved app that owns the live Meta
integration, the Stripe data, and the persuasion analytics engine. This
repo is a working reference implementation on dummy data; this guide is
the map for lifting it into your app with the least possible rework.

Read this first, then `meta-field-map.md` (field-by-field API mapping).

## The one-paragraph architecture

Every screen reads through two interfaces — `AdsProvider` (ad structure +
daily performance) and `RevenueProvider` (transactions) — defined in
`lib/providers/types.ts`. This repo ships one implementation of each,
backed by `data/seed.json`. Your job is to implement the same two
interfaces against your live Meta connection and Stripe data, swap one
metadata-persistence hook, and delete the seed. Everything else — every
chart, table, matrix, date preset, and derived metric — is designed to
come across unchanged.

## Swap vs. keep

| Path | Verdict | Notes |
|---|---|---|
| `lib/providers/seed-provider.ts` | **REPLACE** | Implement `AdsProvider` + `RevenueProvider` against Meta + Stripe (see checklist) |
| `data/seed.json`, `scripts/generate-seed.mjs` | **DELETE** | Dummy data + its generator |
| `lib/use-asset-overrides.ts` | **REPLACE** | Demo persists asset metadata edits to localStorage; keep the hook's signature (`overrides`, `saveOverride`) and back it with your DB mutations |
| `config/account.ts` | **REPLACE** | Becomes a per-account settings record (FE product id, code prefixes) instead of a constant |
| `lib/types.ts` | **KEEP** | The schema. Persist these entities in your DB however you like; the UI only sees the TypeScript shapes |
| `lib/metrics.ts` | **KEEP** | All aggregation + derived metrics. The rules live here: derived metrics are never stored; revenue sources are never mixed |
| `lib/dates.ts`, `lib/buckets.ts`, `lib/assets.ts` | **KEEP** | Range presets, full-period compare logic, cohort bucketing, asset/pairing rollups |
| `app/**` (all pages + components) | **KEEP** | UI. Only `app/*/page.tsx` server components touch providers — swap the import and they're done |

## Integration checklist

1. **Implement `AdsProvider`.**
   - `getDailyMetrics(range)`: Meta Insights, `level=ad`,
     `time_increment=1`. One `AdDailyMetrics` row per ad per day. Persist
     these rows in your DB (sync job), don't proxy Meta per page load —
     every view aggregates over daily rows and Meta's rate limits won't
     enjoy that.
   - `getAds()` / `getCopyAssets()` / `getCreativeAssets()`: your app
     already creates copy assets and knows which ad each was deployed
     into — that mapping (`ad.copyAssetId`, `ad.creativeAssetId`) is the
     load-bearing join of the whole system. Creative assets and their
     metadata (prompt/script/description) are yours to store; Meta only
     contributes the ad shell (ids, post id/url, ad set, status).
   - `getDataStartDate()` / `getDataEndDate()`: earliest/latest synced
     day. "Today" everywhere in the UI is `getDataEndDate()` — feed it
     the last *complete* day so partial-day data never skews compares.
2. **Implement `RevenueProvider`.**
   - Stripe charges → `Sale` rows (see field map). Set
     `type: "FE"` iff the product is the account's designated FE product;
     everything else is `"BE"` — including a first purchase of a
     high-ticket product.
   - `source` is per-row and honest: `"stripe"` for real transactions,
     `"meta_attributed"` only when building fallback rows from pixel
     values for accounts with no Stripe connection. `aggregate()` picks
     the best available source per query and the UI labels it. Never
     merge sources into one number.
   - `adId` attribution is nullable and imperfect. Unattributed sales
     still count in page-level tiles; per-ad/per-asset tables show
     attributed-only (footnoted in the UI).
3. **Swap the metadata hook.** `useAssetOverrides` → your DB. The drawer
   edits four fields: `name`, `description`, `fullText`/`promptOrScript`,
   `notes`. These are the fields your persuasion engine reads to "see"
   creatives.
4. **Wire per-account config.** `designatedFeProductId`, code prefixes
   (V/I/C — the operator may prefer S for statics), currency.
5. **Delete the seed**, point the pages at your providers, done.

## Rules that must survive the port

These are the invariants the UI assumes; break them and numbers go wrong
quietly:

- **Daily grain is the only stored performance data.** Every range,
  cohort, and day-of-week view aggregates daily rows at query time.
  Never store a derived metric (CTR, CPA, ROAS…) — compute via
  `lib/metrics.ts#derived`.
- **Ad labels are derived, never stored.** `adLabel()` renders
  `001 · V4-C3` from seq + the joined assets. No hand-typed labels.
- **Null ≠ zero.** Static images have `null` video metrics, not 0.
  `aggregate()` keeps null when nothing in the group has video data and
  the UI renders "—". A `0` means "ran and got nothing," which is a
  different fact.
- **Weeks are Mon–Sun; "last full week/month/quarter" means completed
  periods only** (`lib/dates.ts`). The quick-compare cards and cohort
  deltas rely on this.
- **Timezone: one zone per account, applied at sync time.** Seed data
  treats dates as account-timezone calendar days; do the same when
  ingesting Meta (`date_start` is already account-tz) and Stripe
  (`created` is UTC epoch — convert before bucketing into days).
- **BE lag is real.** Back-end payments land on their payment date, so
  recent periods understate the eventual BE of their FE sales. The UI
  footnotes this; don't "fix" it by backdating BE revenue onto the FE
  date — that would break revenue-by-period truthfulness. If you later
  want cohort-attributed LTV (BE revenue credited to the FE purchase
  date), add it as a separate, labeled view.

## What is intentionally NOT here

- Auth, multi-user, multi-ad-account switching — your app owns those.
- A database — the schema is designed for one; this demo runs in-memory.
- The persuasion analysis itself — this system produces its inputs:
  performance joined to asset metadata.
- Write-back to Meta (pausing ads, budget changes). Read-only by design.

## Quick file tour

```
lib/types.ts              entities + adLabel()
lib/providers/types.ts    ← THE SEAM (2 interfaces)
lib/providers/seed-provider.ts   demo impl (replace)
lib/metrics.ts            aggregate(), derived, metric registry, formats
lib/dates.ts              presets, full-period ranges, week math
lib/buckets.ts            cohort bucketing + day-of-week
lib/assets.ts             per-asset + copy×creative pairing rollups
lib/use-asset-overrides.ts  metadata persistence (replace)
config/account.ts         per-account settings (replace with DB record)
app/page.tsx + dashboard-client.tsx     main dashboard
app/trends/                bucketed charts, DOW, cohort table
app/assets/                asset library, pairing matrix, edit drawer
docs/meta-field-map.md     field-by-field Meta/Stripe mapping
```
