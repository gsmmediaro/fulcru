import {
  RiToolsLine,
  RiSpeedUpLine,
  RiCheckDoubleLine,
  RiRefreshLine,
  RiGlobeLine,
  RiCodeBoxLine,
  RiArrowRightUpLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/cn";

const TOOLS: {
  title: string;
  description: string;
  icon: RemixiconComponentType;
  cta: string;
  badge?: string;
}[] = [
  {
    title: "Proxy Tester",
    description:
      "Validate any proxy in one click — checks anonymity, latency, and geolocation.",
    icon: RiCheckDoubleLine,
    cta: "Open tester",
  },
  {
    title: "Proxy Speed Test",
    description:
      "Benchmark download/upload speed across regions to pick the fastest pool.",
    icon: RiSpeedUpLine,
    cta: "Run speed test",
  },
  {
    title: "IP Rotator",
    description:
      "Configure rotation rules and TTL for sticky sessions without leaving the dashboard.",
    icon: RiRefreshLine,
    cta: "Configure",
  },
  {
    title: "GeoIP Lookup",
    description:
      "Resolve any IP to country, region, ISP, and detect VPN/proxy fingerprints.",
    icon: RiGlobeLine,
    cta: "Look up IP",
  },
  {
    title: "API Playground",
    description:
      "Try our endpoints live with auto-generated cURL, Python, Node, and Go snippets.",
    icon: RiCodeBoxLine,
    cta: "Open playground",
    badge: "New",
  },
];

export default function ToolsPage() {
  return (
    <AppShell>
      <div className="flex items-center gap-[14px]">
        <span
          className={cn(
            "flex size-[44px] shrink-0 items-center justify-center rounded-full",
            "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
          )}
        >
          <RiToolsLine size={20} />
        </span>
        <div className="flex flex-col">
          <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
            Tools
          </h1>
          <p className="mt-[2px] text-[13px] text-[var(--color-text-soft)]">
            Utilities to test, debug, and optimize your proxy workflows.
          </p>
        </div>
      </div>

      <div
        className={cn(
          "enter-stagger mt-[24px] grid gap-[12px] sm:gap-[16px]",
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {TOOLS.map((t) => (
          <article
            key={t.title}
            className={cn(
              "group relative flex flex-col gap-[14px] rounded-[12px]",
              "bg-[var(--color-bg-surface)] p-[20px] lg:p-[24px]",
              "ring-1 ring-[var(--color-stroke-soft)]",
              "transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-spring)]",
              "hover:-translate-y-[2px] hover:ring-[var(--color-stroke-sub)] hover:shadow-[var(--shadow-regular-md)]",
            )}
          >
            <header className="flex items-start gap-[12px]">
              <span
                className={cn(
                  "flex size-[40px] shrink-0 items-center justify-center rounded-full",
                  "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
                  "transition-transform duration-300 ease-[var(--ease-soft-spring)]",
                  "group-hover:scale-[1.08] group-hover:-rotate-[6deg]",
                )}
              >
                <t.icon size={20} />
              </span>
              <div className="flex min-w-0 flex-col gap-[2px]">
                <div className="flex items-center gap-[8px]">
                  <h3 className="text-[16px] font-bold leading-[22px]">
                    {t.title}
                  </h3>
                  {t.badge ? (
                    <span
                      className={cn(
                        "rounded-[4px] px-[6px] py-[1px] text-[10px] font-bold uppercase tracking-[0.06em]",
                        "bg-[color-mix(in_oklab,var(--color-brand-400)_20%,transparent)]",
                        "text-[var(--color-brand-400)]",
                      )}
                    >
                      {t.badge}
                    </span>
                  ) : null}
                </div>
              </div>
            </header>

            <p className="text-[13px] leading-[20px] text-[var(--color-text-sub)]">
              {t.description}
            </p>

            <a
              href="#"
              className={cn(
                "mt-auto inline-flex items-center gap-[6px] text-[13px] font-semibold",
                "text-[var(--color-brand-400)] hover:text-[var(--color-brand-500)]",
              )}
            >
              {t.cta}
              <RiArrowRightUpLine size={14} />
            </a>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
