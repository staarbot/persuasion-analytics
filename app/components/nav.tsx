"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/trends", label: "Trends" },
  { href: "/assets", label: "Assets" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
              active
                ? "bg-ink-900 text-cream-200"
                : "text-ink-800 hover:bg-cream-300"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
