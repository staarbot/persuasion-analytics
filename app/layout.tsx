import type { Metadata } from "next";
import "./globals.css";
import { accountConfig } from "@/config/account";

export const metadata: Metadata = {
  title: "Persuasion Analytics — Ads Dashboard",
  description:
    "Ad performance married to the copy and creative assets behind it.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-ink-800/12 bg-cream-100">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-baseline justify-between">
            <div className="flex items-baseline gap-3">
              <span
                className="text-xl font-semibold text-ink-900"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Persuasion Analytics
              </span>
              <span className="label-caps">Ads Dashboard · Demo</span>
            </div>
            <span className="label-caps">{accountConfig.accountName}</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
