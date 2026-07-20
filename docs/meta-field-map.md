# Field map: seed data → live sources

This is the handoff contract. Every field in `data/seed.json` maps to a real
field in the Meta Marketing API or Stripe. Implement `AdsProvider` and
`RevenueProvider` (see `lib/providers/types.ts`) against these sources and the
entire UI works unchanged.

## AdsProvider → Meta Marketing API

Insights request shape the seed data mirrors:

```
GET /v21.0/act_{ad_account_id}/insights
  ?level=ad
  &time_increment=1            ← daily grain, one row per ad per day
  &time_range={"since":FROM,"until":TO}
  &fields=ad_id,impressions,reach,clicks,spend,actions,action_values,
          video_3_sec_watched_actions,video_thruplay_watched_actions
```

| `AdDailyMetrics` field | Meta Insights field |
|---|---|
| `adId` | `ad_id` |
| `date` | `date_start` (with `time_increment=1`) |
| `impressions` | `impressions` |
| `reach` | `reach` |
| `clicks` | `clicks` (all clicks) |
| `linkClicks` | `actions` → `action_type = "link_click"` |
| `spend` | `spend` |
| `video3sViews` | `video_3_sec_watched_actions` (null for statics) |
| `thruplays` | `video_thruplay_watched_actions` (null for statics) |
| `metaPurchases` | `actions` → `action_type = "purchase"` (pixel/CAPI) |
| `metaPurchaseValue` | `action_values` → `action_type = "purchase"` |

Ad structure (`Ad` entity) comes from `/act_{id}/ads?fields=id,name,status,
adset{name},creative{effective_object_story_id}`; the `postId`/`postUrl` come
from `effective_object_story_id`.

`copyAssetId` / `creativeAssetId` assignments are OURS, not Meta's — the
destination app stores this mapping when an asset is deployed into an ad (it
already knows, since it creates the copy assets). The ad's display label
("001 · V4-C3") is always derived via `adLabel()` in `lib/types.ts` — never
stored, never hand-typed.

## RevenueProvider → Stripe (preferred) or Meta fallback

| `Sale` field | Stripe source |
|---|---|
| `id` | `charge.id` / `payment_intent.id` |
| `date` | `charge.created` |
| `amount` | `charge.amount` (converted from cents) |
| `productId` / `productName` | line item product |
| `type` | `"FE"` iff `productId === accountConfig.designatedFeProductId`, else `"BE"` — including first-time buyers of high-ticket |
| `source` | `"stripe"` |
| `customerId` | `charge.customer` |
| `isNewCustomer` | first charge for this customer in the account |
| `adId` | attribution: UTM / metadata passed through checkout, where known |

**Graceful degradation:** if an account has no Stripe connection, aggregation
falls back to Meta-attributed purchase values (`source: "meta_attributed"`).
The active source is computed per query in `lib/metrics.ts#aggregate` and is
surfaced in the UI — sources are never silently mixed.

## Swapping in real data during the demo phase

Replace `data/seed.json` with any file matching `SeedDataset`
(`lib/types.ts`). Regenerate dummy data anytime with:

```
node scripts/generate-seed.mjs
```
