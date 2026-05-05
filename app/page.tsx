import {
  RiHome4Line,
  RiFlashlightLine,
  RiServerLine,
  RiSmartphoneLine,
  RiShieldKeyholeLine,
  RiArrowRightUpLine,
  RiCircleFill,
} from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { ProductCard } from "@/components/home/product-card";
import { FindPerfectProxyCard } from "@/components/home/find-perfect-proxy-card";
import { StatisticsPanel } from "@/components/home/statistics-panel";
import { cn } from "@/lib/cn";

const PRODUCTS = [
  {
    title: "Residential",
    pricing: "from $1.75/GB",
    icon: RiHome4Line,
    accent: "teal" as const,
    bullets: [
      "32M+ ethical IPs across 195 countries",
      "Target by country, state, and city",
      "Rotating or sticky sessions",
    ],
  },
  {
    title: "ISP",
    pricing: "from $2.40/proxy",
    icon: RiFlashlightLine,
    accent: "rose" as const,
    bullets: [
      "Premium ISP-grade providers",
      "Unlimited concurrent sessions",
      "State and city-level targeting",
    ],
  },
  {
    title: "Datacenter",
    pricing: "from $1.39/proxy",
    icon: RiServerLine,
    accent: "green" as const,
    bullets: [
      "99.9% network uptime",
      "State and city targeting",
      "Unlimited concurrent sessions",
    ],
  },
  {
    title: "Mobile",
    pricing: "from $10.11/day",
    icon: RiSmartphoneLine,
    accent: "blue" as const,
    bullets: [
      "Easy API integration",
      "Unlimited bandwidth & sessions",
      "Works across 5G / 4G / 3G / LTE",
    ],
  },
  {
    title: "Web Unblocker",
    pricing: "from $0.70 per 1000 requests",
    icon: RiShieldKeyholeLine,
    accent: "orange" as const,
    bullets: [
      "Smart anti-bot bypass",
      "Pay only for successful requests",
      "Powered by a 32M+ IP pool",
    ],
  },
];

export default function HomePage() {
  return (
    <AppShell>
      {/* Title row */}
      <div className="flex flex-col gap-[12px] md:flex-row md:flex-wrap md:items-end md:justify-between">
        <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
          Home
        </h1>
        <nav
          className={cn(
            "scrollbar-thin -mx-[16px] flex items-center gap-x-[18px] overflow-x-auto px-[16px]",
            "pb-[2px] text-[13px] font-semibold",
            "md:mx-0 md:flex-wrap md:gap-x-[20px] md:overflow-visible md:px-0 md:pb-0",
          )}
        >
          <ExternalLink href="#">Quick-Start guides</ExternalLink>
          <ExternalLink href="#">Documentation</ExternalLink>
          <ExternalLink href="#" decorator={<StatusDot />}>
            Network status
          </ExternalLink>
        </nav>
      </div>

      {/* Product grid */}
      <div
        className={cn(
          "enter-stagger mt-[20px] grid gap-[12px] sm:mt-[24px] sm:gap-[16px]",
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {PRODUCTS.map((p) => (
          <ProductCard key={p.title} {...p} />
        ))}
        <FindPerfectProxyCard />
      </div>

      {/* Statistics */}
      <div className="mt-[20px] sm:mt-[24px]">
        <StatisticsPanel />
      </div>
    </AppShell>
  );
}

function ExternalLink({
  href,
  children,
  decorator,
}: {
  href: string;
  children: React.ReactNode;
  decorator?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-[6px] text-[var(--color-text-strong)] transition-colors hover:text-[var(--color-brand-400)]"
    >
      {decorator}
      {children}
      <RiArrowRightUpLine
        size={14}
        className="translate-y-[0.5px] text-[var(--color-text-soft)] transition-colors group-hover:text-[var(--color-brand-400)]"
      />
    </a>
  );
}

function StatusDot() {
  return (
    <span
      className="relative inline-flex size-[8px] shrink-0"
      aria-label="Network operational"
      title="All systems operational"
    >
      <span
        aria-hidden
        className="breathe-dot absolute inset-0 rounded-full bg-emerald-400"
      />
      <RiCircleFill
        size={8}
        className="relative text-emerald-400 drop-shadow-[0_0_4px_rgb(52_211_153/0.6)]"
      />
    </span>
  );
}
