// Generates data/seed.json — a realistic dummy dataset shaped like real
// Meta Insights (daily grain) + Stripe transactions.
//
// Deterministic: same seed → same data, so the demo is stable across runs.
// To use REAL data instead, replace data/seed.json with an export matching
// lib/types.ts#SeedDataset — nothing else changes.
//
// Run: node scripts/generate-seed.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- Seeded RNG (mulberry32) ---------------------------------------------
let state = 0xc0ffee;
function rand() {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (lo, hi) => lo + rand() * (hi - lo);
const jitter = (x, pct) => x * between(1 - pct, 1 + pct);

// --- Time window: 18 months ending 2026-07-19 ----------------------------
const END = new Date(Date.UTC(2026, 6, 19));
const START = new Date(Date.UTC(2025, 0, 20));
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

// --- Copy assets: C1–C8 (the CSV's Copy 1–8) ------------------------------
const COPY_THEMES = [
  ["Pattern-interrupt origin story", "Opens on the moment the founder almost quit; pivots to the mechanism."],
  ["Cost-of-inaction math", "Leads with what a dead ad account costs per week, in dollars."],
  ["Identity shift", "‘You're not bad at ads, you're using a broken map’ framing."],
  ["Proof-stack short", "Three rapid client outcomes, no adjectives, straight CTA."],
  ["Contrarian teardown", "Attacks ‘best practices’ the audience already distrusts."],
  ["Future-pacing demo", "Walks the reader through their first week using the system."],
  ["FAQ objection crusher", "Answers the top three objections before the pitch."],
  ["Curiosity gap", "Names the mechanism but withholds the how until the click."],
];
const copyAssets = COPY_THEMES.map(([name, description], i) => ({
  id: `copy_${i + 1}`,
  code: `C${i + 1}`,
  name,
  fullText: `[Dummy copy body for ${name} — replace with the real ad copy text.]`,
  description,
  notes: "",
  source: i < 6 ? "persuasion-system" : "manual",
  createdAt: iso(addDays(START, i * 12)),
}));

// --- Creative assets: V2–V7 videos + I1–I2 statics (from the CSV) ---------
const CREATIVES = [
  ["V2", "video", "Founder talking-head, whiteboard behind", "Hook: rips a printed report in half on camera."],
  ["V3", "video", "Screen-record walkthrough of the dashboard", "Hook: cursor circles a losing metric, hard cut."],
  ["V4", "video", "UGC-style selfie testimonial", "Hook: ‘I wasted $40k before I saw this.’"],
  ["V5", "video", "B-roll + captions, no talking head", "Hook: coffee pour synced to spend counter."],
  ["V6", "video", "Split-screen before/after ad account", "Hook: two screens, one number turning green."],
  ["V7", "video", "Street interview remix", "Hook: ‘What's a good CPA?’ asked to strangers."],
  ["I1", "image", "Static: annotated screenshot of results graph", "Red-circle annotation, handwritten arrow style."],
  ["I2", "image", "Static: bold text-on-color pattern interrupt", "Giant type: ‘Your ads aren't the problem.’"],
];
const creativeAssets = CREATIVES.map(([code, type, name, description], i) => ({
  id: `creative_${code.toLowerCase()}`,
  code,
  type,
  name,
  description,
  promptOrScript: `[Dummy ${type === "video" ? "script" : "image prompt"} for ${code} — replace with the real one.]`,
  notes: "",
  thumbnailUrl: null,
  createdAt: iso(addDays(START, i * 10)),
}));

// Latent quality factors: what makes some assets, and some PAIRINGS, better.
const copyQuality = [1.15, 0.92, 1.3, 1.0, 0.85, 1.05, 0.78, 1.2];
const creativeQuality = { V2: 1.2, V3: 0.95, V4: 1.3, V5: 0.8, V6: 1.05, V7: 0.7, I1: 1.1, I2: 0.9 };
// Specific pairings that over/under-perform their parts (the interplay story)
const pairingBonus = { "V4|C3": 1.35, "V2|C1": 1.2, "I1|C3": 0.75, "V6|C8": 1.25, "V3|C2": 0.8 };

// --- Ads: the CSV's 8 (distinct pairings) + reuse pairings for pivots ------
// [creativeCode, copyIdx(1-based), adSetName, launchDayOffset, postUrl]
const AD_DEFS = [
  ["V2", 1, "Broad 25-54", 30, "https://www.facebook.com/61582427412677/videos/1296363525908968/#"],
  ["V3", 2, "Broad 25-54", 38, "https://www.facebook.com/61582427412677/videos/981742848232797/#"],
  ["V4", 3, "Broad 25-54", 52, "https://www.facebook.com/61582427412677/videos/1666939157748785/#"],
  ["V5", 4, "Interest: DTC founders", 70, "https://www.facebook.com/61582427412677/videos/1726990352377246/#"],
  ["V6", 5, "Interest: DTC founders", 90, "https://www.facebook.com/61582427412677/videos/1376599044414149/#"],
  ["V7", 6, "Lookalike 1% buyers", 118, "https://www.facebook.com/61582427412677/videos/1797188054662072/#"],
  ["I1", 7, "Retargeting 30d", 130, "https://www.facebook.com/permalink.php?story_fbid=pfbid02K8qmwmpcMttNoNmipgbAgSy6WBiWt7Y99NYyXZmb8YyUSpNygAUShTXUkANv6PCrl&id=61582427412677#"],
  ["I2", 8, "Retargeting 30d", 142, null],
  // Reuse: same copy across creatives / same creative across copies
  ["V4", 1, "Broad 25-54", 200, null],
  ["V2", 3, "Lookalike 1% buyers", 215, null],
  ["I1", 3, "Broad 25-54", 240, null],
  ["V6", 8, "Interest: DTC founders", 265, null],
  ["V4", 3, "Lookalike 1% buyers", 300, null],
  ["I2", 1, "Retargeting 30d", 330, null],
];

const ads = AD_DEFS.map(([creativeCode, copyIdx, adSetName, offset, postUrl], i) => {
  const launched = addDays(START, offset);
  return {
    id: `ad_${i + 1}`,
    seq: i + 1,
    metaAdId: `238${String(4200000000 + i * 7919).slice(0, 10)}`,
    postId: `pfbid_dummy_${i + 1}`,
    postUrl,
    copyAssetId: `copy_${copyIdx}`,
    creativeAssetId: `creative_${creativeCode.toLowerCase()}`,
    adSetName,
    status: i < 12 ? "active" : "paused",
    launchedAt: iso(launched),
  };
});

// --- Daily metrics + sales -------------------------------------------------
const FE_PRICE = 37;
const BE_PRODUCTS = [
  ["prod_be_accelerator", "Accelerator Program", 1997],
  ["prod_be_intensive", "1:1 Intensive", 4500],
  ["prod_be_continuity", "Continuity (monthly)", 297],
];
const dailyMetrics = [];
const sales = [];
let customerSeq = 1;
let saleSeq = 1;

// Account-level seasonality: mild growth + Q4 bump + day-of-week shape
const dowFactor = [0.82, 1.0, 1.08, 1.12, 1.05, 0.95, 0.88]; // Sun..Sat
function seasonFactor(d) {
  const month = d.getUTCMonth();
  const q4 = month >= 9 ? 1.18 : 1.0;
  const growth = 1 + (d - START) / (END - START) * 0.5;
  return q4 * growth;
}

for (const ad of ads) {
  const creative = creativeAssets.find((c) => c.id === ad.creativeAssetId);
  const copyIdx = Number(ad.copyAssetId.split("_")[1]);
  const pairKey = `${creative.code}|C${copyIdx}`;
  const quality =
    copyQuality[copyIdx - 1] * creativeQuality[creative.code] * (pairingBonus[pairKey] ?? 1);
  const isVideo = creative.type === "video";
  const baseBudget = between(60, 140); // daily spend target
  const baseCpm = between(22, 34);
  const launch = new Date(ad.launchedAt + "T00:00:00Z");
  // Ads fatigue: performance decays slowly after ~60 days live
  for (let d = new Date(launch); d <= END; d = addDays(d, 1)) {
    const ageDays = (d - launch) / 86400000;
    // Paused ads stop spending after ~120 days
    if (ad.status === "paused" && ageDays > 120) break;
    const fatigue = ageDays > 60 ? Math.max(0.55, 1 - (ageDays - 60) * 0.004) : 1;
    const day = dowFactor[d.getUTCDay()] * seasonFactor(d);
    const spend = jitter(baseBudget * day, 0.25);
    const cpm = jitter(baseCpm / (0.9 + quality * 0.1), 0.15);
    const impressions = Math.round((spend / cpm) * 1000);
    const reach = Math.round(impressions * between(0.62, 0.8));
    const ctrAll = 0.011 * quality * fatigue; // all clicks
    const clicks = Math.round(impressions * jitter(ctrAll, 0.3));
    const linkClicks = Math.round(clicks * between(0.55, 0.72));
    const video3sViews = isVideo ? Math.round(impressions * jitter(0.28 * quality, 0.2)) : null;
    const thruplays = isVideo ? Math.round(video3sViews * jitter(0.32 * quality, 0.25)) : null;

    // Purchases: FE conversion off link clicks; quality moves it hard
    const feCvr = 0.028 * quality * fatigue;
    let fePurchases = 0;
    let expected = linkClicks * feCvr;
    while (expected > 0) {
      if (rand() < Math.min(expected, 1)) fePurchases++;
      expected -= 1;
    }
    const metaPurchases = fePurchases;
    const metaPurchaseValue = fePurchases * FE_PRICE;

    dailyMetrics.push({
      adId: ad.id,
      date: iso(d),
      impressions,
      reach,
      clicks,
      linkClicks,
      spend: Math.round(spend * 100) / 100,
      video3sViews,
      thruplays,
      metaPurchases,
      metaPurchaseValue,
    });

    // Stripe sales: FE sale per purchase; some buyers ascend to BE later
    for (let p = 0; p < fePurchases; p++) {
      const customerId = `cus_${String(customerSeq++).padStart(5, "0")}`;
      sales.push({
        id: `sale_${saleSeq++}`,
        date: iso(d),
        amount: FE_PRICE,
        productId: "prod_fe_persuasion_melody",
        productName: "Persuasion Melody (FE)",
        type: "FE",
        source: "stripe",
        customerId,
        isNewCustomer: true,
        adId: ad.id,
      });
      // ~10% ascend to a BE product 3–45 days later (higher for good pairings).
      // Product mix skews toward continuity so BE revenue stays believable.
      if (rand() < 0.1 * Math.min(quality, 1.4)) {
        const beDate = addDays(d, Math.round(between(3, 45)));
        if (beDate <= END) {
          const roll = rand();
          const [productId, productName, price] =
            roll < 0.5 ? BE_PRODUCTS[2] : roll < 0.85 ? BE_PRODUCTS[0] : BE_PRODUCTS[1];
          sales.push({
            id: `sale_${saleSeq++}`,
            date: iso(beDate),
            amount: price,
            productId,
            productName,
            type: "BE",
            source: "stripe",
            customerId,
            isNewCustomer: false,
            adId: ad.id,
          });
        }
      }
    }
  }
}

// A few straight-to-BE first purchases (still BE per the classification rule)
for (let i = 0; i < 14; i++) {
  const d = addDays(START, Math.round(between(60, 540)));
  if (d > END) continue;
  const [productId, productName, price] = BE_PRODUCTS[Math.floor(rand() * 3)];
  sales.push({
    id: `sale_${saleSeq++}`,
    date: iso(d),
    amount: price,
    productId,
    productName,
    type: "BE",
    source: "stripe",
    customerId: `cus_${String(customerSeq++).padStart(5, "0")}`,
    isNewCustomer: true,
    adId: null,
  });
}

sales.sort((a, b) => a.date.localeCompare(b.date));

const dataset = {
  generatedAt: "2026-07-20T00:00:00Z",
  copyAssets,
  creativeAssets,
  ads,
  dailyMetrics,
  sales,
};

mkdirSync(join(root, "data"), { recursive: true });
writeFileSync(join(root, "data", "seed.json"), JSON.stringify(dataset));
console.log(
  `Wrote data/seed.json — ${ads.length} ads, ${dailyMetrics.length} daily rows, ${sales.length} sales (${sales.filter((s) => s.type === "FE").length} FE / ${sales.filter((s) => s.type === "BE").length} BE)`
);
