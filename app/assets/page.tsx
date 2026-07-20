import { seedAdsProvider, seedRevenueProvider } from "@/lib/providers/seed-provider";
import AssetsClient from "./assets-client";

export default async function AssetsPage() {
  const dataStart = await seedAdsProvider.getDataStartDate();
  const dataEnd = await seedAdsProvider.getDataEndDate();
  const [ads, copyAssets, creativeAssets, dailyMetrics, sales] =
    await Promise.all([
      seedAdsProvider.getAds(),
      seedAdsProvider.getCopyAssets(),
      seedAdsProvider.getCreativeAssets(),
      seedAdsProvider.getDailyMetrics({ from: dataStart, to: dataEnd }),
      seedRevenueProvider.getSales({ from: dataStart, to: dataEnd }),
    ]);

  return (
    <AssetsClient
      ads={ads}
      copyAssets={copyAssets}
      creativeAssets={creativeAssets}
      dailyMetrics={dailyMetrics}
      sales={sales}
      dataStart={dataStart}
      dataEnd={dataEnd}
    />
  );
}
