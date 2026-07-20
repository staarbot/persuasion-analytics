import { seedAdsProvider, seedRevenueProvider } from "@/lib/providers/seed-provider";
import TrendsClient from "./trends-client";

export default async function TrendsPage() {
  const dataStart = await seedAdsProvider.getDataStartDate();
  const dataEnd = await seedAdsProvider.getDataEndDate();
  const [dailyMetrics, sales] = await Promise.all([
    seedAdsProvider.getDailyMetrics({ from: dataStart, to: dataEnd }),
    seedRevenueProvider.getSales({ from: dataStart, to: dataEnd }),
  ]);

  return (
    <TrendsClient
      dailyMetrics={dailyMetrics}
      sales={sales}
      dataStart={dataStart}
      dataEnd={dataEnd}
    />
  );
}
