"use client";

import { useEffect, useState } from "react";
import type { Ad, CopyAsset, CreativeAsset } from "@/lib/types";
import { adLabel } from "@/lib/types";
import { derived, formatMetric, type Totals } from "@/lib/metrics";
import type { AssetOverride } from "@/lib/use-asset-overrides";
import type { AssetPerf } from "@/lib/assets";

export type DrawerTarget =
  | { kind: "copy"; asset: CopyAsset }
  | { kind: "creative"; asset: CreativeAsset };

interface Props {
  target: DrawerTarget;
  override: AssetOverride | undefined;
  perf: AssetPerf | undefined;
  ads: Ad[];
  copyAssets: CopyAsset[];
  creativeAssets: CreativeAsset[];
  perAd: Map<string, Totals>;
  onSave: (assetId: string, patch: AssetOverride) => void;
  onClose: () => void;
}

export default function AssetDrawer({
  target,
  override,
  perf,
  ads,
  copyAssets,
  creativeAssets,
  perAd,
  onSave,
  onClose,
}: Props) {
  const asset = target.asset;
  const isCopy = target.kind === "copy";
  const bodyField = isCopy ? "fullText" : "promptOrScript";
  const bodyLabel = isCopy
    ? "Full ad copy"
    : (asset as CreativeAsset).type === "video"
      ? "Video script"
      : "Image prompt";

  const [form, setForm] = useState<AssetOverride>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setForm({
      name: override?.name ?? asset.name,
      description: override?.description ?? asset.description,
      notes: override?.notes ?? asset.notes,
      [bodyField]:
        override?.[bodyField] ??
        (isCopy ? (asset as CopyAsset).fullText : (asset as CreativeAsset).promptOrScript),
    });
    setSaved(false);
  }, [asset.id, override, asset, bodyField, isCopy]);

  const deployments = ads
    .filter((a) => (isCopy ? a.copyAssetId : a.creativeAssetId) === asset.id)
    .filter((a) => (perAd.get(a.id)?.impressions ?? 0) > 0)
    .sort((a, b) => (perAd.get(b.id)?.spend ?? 0) - (perAd.get(a.id)?.spend ?? 0));
  const copyById = new Map(copyAssets.map((c) => [c.id, c]));
  const creativeById = new Map(creativeAssets.map((c) => [c.id, c]));

  const field = (label: string, key: keyof AssetOverride, rows: number, placeholder: string) => (
    <div>
      <label className="label-caps block mb-1.5">{label}</label>
      <textarea
        rows={rows}
        value={(form[key] as string) ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          setForm((f) => ({ ...f, [key]: e.target.value }));
          setSaved(false);
        }}
        className="w-full bg-white border border-ink-800/12 rounded px-3 py-2 text-sm resize-y"
      />
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-ink-900/30 z-40" onClick={onClose} />
      <aside
        className="fixed top-0 right-0 h-full w-[min(460px,100vw)] bg-cream-100 border-l border-ink-800/12 z-50 overflow-y-auto shadow-2xl"
        style={{ animation: "slideInRight 0.18s ease-out" }}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="code-chip"
                  style={
                    isCopy
                      ? { backgroundColor: "#8E33B31c", color: "#71288F" }
                      : (asset as CreativeAsset).type === "video"
                        ? { backgroundColor: "#4A78D822", color: "#3757A8" }
                        : { backgroundColor: "#C4922A22", color: "#8A6414" }
                  }
                >
                  {asset.code}
                </span>
                <span className="label-caps">
                  {isCopy
                    ? `Copy asset · ${(asset as CopyAsset).source === "persuasion-system" ? "from persuasion system" : "manual"}`
                    : `Creative · ${(asset as CreativeAsset).type}`}
                </span>
              </div>
              <h2
                className="text-xl font-semibold text-ink-900"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {form.name || asset.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-taupe-500 hover:text-ink-800 text-xl leading-none px-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Aggregate performance */}
          {perf && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Ads", v: formatMetric(perf.adIds.length, "int") },
                { label: "Paired with", v: `${perf.partnerIds.length} ${isCopy ? "creatives" : "copies"}` },
                { label: "Spend", v: formatMetric(perf.totals.spend, "money") },
                { label: "CPA", v: formatMetric(derived.cpa(perf.totals), "money2") },
                { label: "Full ROAS", v: formatMetric(derived.fullRoas(perf.totals), "ratio") },
                { label: "P/L", v: formatMetric(derived.profit(perf.totals), "money") },
              ].map((s) => (
                <div key={s.label} className="bg-cream-300 rounded p-2.5">
                  <div className="label-caps !text-[9.5px] mb-0.5">{s.label}</div>
                  <div className="font-num text-[13px] font-medium text-ink-900">{s.v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Editable metadata */}
          <div className="space-y-4">
            <div>
              <label className="label-caps block mb-1.5">Name</label>
              <input
                value={form.name ?? ""}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  setSaved(false);
                }}
                className="w-full bg-white border border-ink-800/12 rounded px-3 py-2 text-sm"
              />
            </div>
            {field("Description (what it is / what's happening)", "description", 3,
              isCopy ? "Angle, hook mechanism, framing…" : "What's on screen, style, key moments…")}
            {field(bodyLabel, bodyField, 6,
              isCopy ? "Paste the full ad copy…" : "The prompt that made the image, or the video script…")}
            {field("Notes for the persuasion system", "notes", 3,
              "Anything the analysis should know about this asset…")}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  onSave(asset.id, form);
                  setSaved(true);
                }}
                className="bg-gold-500 text-ink-900 px-4 py-2 rounded font-semibold text-sm hover:bg-gold-400 transition-colors"
              >
                Save metadata
              </button>
              {saved && <span className="text-xs text-signal-green font-semibold">Saved ✓</span>}
              <span className="text-[10px] text-taupe-500">
                Demo saves to this browser; the live app saves to its database.
              </span>
            </div>
          </div>

          {/* Deployments */}
          <div>
            <h3 className="label-caps mb-2">Deployments · {deployments.length}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-800/12">
                  <th className="text-left py-1.5 label-caps !text-[10px]">Ad</th>
                  <th className="text-left py-1.5 label-caps !text-[10px]">Paired with</th>
                  <th className="text-right py-1.5 label-caps !text-[10px]">Spend</th>
                  <th className="text-right py-1.5 label-caps !text-[10px]">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((ad) => {
                  const t = perAd.get(ad.id);
                  const partner = isCopy
                    ? creativeById.get(ad.creativeAssetId)
                    : copyById.get(ad.copyAssetId);
                  return (
                    <tr key={ad.id} className="border-b border-ink-800/8">
                      <td className="py-1.5">
                        <span className="font-num text-[12px]">
                          {adLabel(ad, creativeById.get(ad.creativeAssetId), copyById.get(ad.copyAssetId))}
                        </span>
                        <div className="text-[10px] text-taupe-500">{ad.adSetName}</div>
                      </td>
                      <td className="py-1.5">
                        <span className="code-chip" style={{ backgroundColor: "#2A252012", color: "#6B5E4D" }}>
                          {partner?.code}
                        </span>
                      </td>
                      <td className="py-1.5 text-right font-num text-[12px]">
                        {formatMetric(t?.spend ?? null, "money")}
                      </td>
                      <td className="py-1.5 text-right font-num text-[12px]">
                        {t ? formatMetric(derived.fullRoas(t), "ratio") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </aside>
    </>
  );
}
