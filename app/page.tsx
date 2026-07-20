import { seedAdsProvider, seedRevenueProvider } from "@/lib/providers/seed-provider";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  // The provider seam: swap seed providers for live Meta + Stripe
  // implementations in the destination app and this page doesn't change.
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
    <DashboardClient
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
