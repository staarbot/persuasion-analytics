"use client";

// Demo-only persistence for asset metadata edits: a localStorage overlay on
// top of the seed data. In the destination app these same fields persist to
// its database through whatever mutation layer it already uses — the UI
// components only touch this hook, so the swap is contained here.

import { useCallback, useEffect, useState } from "react";

export interface AssetOverride {
  name?: string;
  description?: string;
  promptOrScript?: string;
  notes?: string;
  fullText?: string;
}

export type OverrideMap = Record<string, AssetOverride>;

const KEY = "pa.asset-overrides.v1";

export function useAssetOverrides() {
  const [overrides, setOverrides] = useState<OverrideMap>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setOverrides(JSON.parse(raw) as OverrideMap);
    } catch {}
  }, []);

  const saveOverride = useCallback((assetId: string, patch: AssetOverride) => {
    setOverrides((prev) => {
      const next = { ...prev, [assetId]: { ...prev[assetId], ...patch } };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return { overrides, saveOverride };
}
