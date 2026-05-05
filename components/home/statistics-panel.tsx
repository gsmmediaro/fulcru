"use client";

import * as React from "react";
import {
  RiCalendar2Line,
  RiArrowRightLine,
  RiInformationLine,
  RiDownload2Line,
  RiRefreshLine,
} from "@remixicon/react";
import { cn } from "@/lib/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UsageChart, type UsagePoint } from "./usage-chart";
import { useCountUp } from "@/lib/use-count-up";
import { FilterWebsitesModal } from "./filter-websites-modal";

const PRODUCTS = [
  { id: "residential", label: "Residential" },
  { id: "isp", label: "ISP" },
  { id: "datacenter", label: "Datacenter" },
  { id: "mobile-dedicated", label: "Mobile Dedicated" },
  { id: "mobile-rotating", label: "Mobile Rotating" },
];

const SAMPLE_WEBSITES: string[] = (() => {
  const base = [
    "google.com",
    "youtube.com",
    "amazon.com",
    "facebook.com",
    "instagram.com",
    "twitter.com",
    "linkedin.com",
    "reddit.com",
    "wikipedia.org",
    "github.com",
    "stackoverflow.com",
    "netflix.com",
    "spotify.com",
    "ebay.com",
    "pinterest.com",
    "tiktok.com",
    "yahoo.com",
    "bing.com",
    "cloudflare.com",
    "vercel.com",
    "apple.com",
    "microsoft.com",
    "adobe.com",
    "shopify.com",
    "walmart.com",
    "bestbuy.com",
    "target.com",
    "cnn.com",
    "bbc.com",
    "nytimes.com",
    "149.154.167.151",
    "149.154.167.91",
    "149.154.167.50",
  ];
  const hashed = Array.from({ length: 20 }).map(
    (_, i) =>
      `${i.toString(16).padStart(2, "0")}a6c5398414711931b56f12.safeframe.googlesyndication.com`,
  );
  return [...hashed, ...base].sort();
})();

const SAMPLE_DATA: Record<string, UsagePoint[]> = {
  residential: [
    { date: "04-16", value: 152 },
    { date: "04-17", value: 406 },
    { date: "04-18", value: 288 },
    { date: "04-19", value: 204 },
    { date: "04-20", value: 198 },
    { date: "04-21", value: 38 },
  ],
  isp: [
    { date: "04-16", value: 60 },
    { date: "04-17", value: 132 },
    { date: "04-18", value: 178 },
    { date: "04-19", value: 212 },
    { date: "04-20", value: 166 },
    { date: "04-21", value: 44 },
  ],
  datacenter: [
    { date: "04-16", value: 10 },
    { date: "04-17", value: 22 },
    { date: "04-18", value: 46 },
    { date: "04-19", value: 60 },
    { date: "04-20", value: 50 },
    { date: "04-21", value: 18 },
  ],
  "mobile-dedicated": [
    { date: "04-16", value: 3 },
    { date: "04-17", value: 8 },
    { date: "04-18", value: 12 },
    { date: "04-19", value: 9 },
    { date: "04-20", value: 14 },
    { date: "04-21", value: 6 },
  ],
  "mobile-rotating": [
    { date: "04-16", value: 26 },
    { date: "04-17", value: 48 },
    { date: "04-18", value: 72 },
    { date: "04-19", value: 94 },
    { date: "04-20", value: 82 },
    { date: "04-21", value: 31 },
  ],
};

export function StatisticsPanel() {
  const [product, setProduct] = React.useState("residential");
  const [unit, setUnit] = React.useState("MB");
  const [period, setPeriod] = React.useState("2026-04-16 – 2026-04-21");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    window.setTimeout(() => setIsRefreshing(false), 700);
  };

  return (
    <section
      className={cn(
        "rounded-[12px] bg-[var(--color-bg-surface)] p-[16px] sm:p-[20px] lg:p-[24px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <header className="mb-[8px] flex flex-wrap items-center justify-between gap-[8px] sm:gap-[12px]">
        <h2 className="tp-overline text-[var(--color-brand-400)]">
          Statistics
        </h2>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          className={cn(
            "inline-flex items-center gap-[6px] rounded-[6px]",
            "px-[8px] py-[4px] text-[12px] font-medium sm:text-[13px]",
            "text-[var(--color-text-sub)] hover:text-[var(--color-text-strong)]",
            "hover:bg-white/5 transition-colors",
            "disabled:cursor-default disabled:text-[var(--color-brand-400)]",
          )}
        >
          <RiRefreshLine
            size={14}
            className={cn(isRefreshing && "spin-once")}
          />
          <span className="hidden sm:inline">
            {isRefreshing ? "Refreshed" : "Refresh for real-time data"}
          </span>
          <span className="sm:hidden">
            {isRefreshing ? "Refreshed" : "Refresh"}
          </span>
        </button>
      </header>

      <Tabs value={product} onValueChange={setProduct}>
        <TabsList
          className={cn(
            "scrollbar-thin mb-[20px] -mx-[16px] overflow-x-auto px-[16px] sm:mx-0 sm:mb-[24px] sm:px-0",
            "border-b-0 sm:border-b sm:border-[var(--color-stroke-soft)]",
          )}
        >
          {PRODUCTS.map((p) => (
            <TabsTrigger key={p.id} value={p.id}>
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {PRODUCTS.map((p) => (
          <TabsContent key={p.id} value={p.id}>
            <div className="grid grid-cols-1 gap-[12px] sm:gap-[16px] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,180px)]">
              <Field label="Select a period">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger leadingIcon={<RiCalendar2Line size={16} />}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026-04-16 – 2026-04-21">
                      2026-04-16 – 2026-04-21
                    </SelectItem>
                    <SelectItem value="Last 7 days">Last 7 days</SelectItem>
                    <SelectItem value="Last 30 days">Last 30 days</SelectItem>
                    <SelectItem value="This month">This month</SelectItem>
                    <SelectItem value="Custom range">Custom range…</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Filter websites">
                <FilterInput websites={SAMPLE_WEBSITES} />
              </Field>

              <Field label="Units">
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KB">KB</SelectItem>
                    <SelectItem value="MB">MB</SelectItem>
                    <SelectItem value="GB">GB</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="mt-[32px]">
              <TotalSummary
                data={SAMPLE_DATA[p.id] ?? []}
                unit={unit}
                label={p.label}
              />
              <div
                key={`${p.id}-${refreshKey}`}
                className="chart-draw mt-[12px]"
              >
                <UsageChart data={SAMPLE_DATA[p.id] ?? []} unit={unit} />
              </div>
            </div>

            <footer className="mt-[24px] flex flex-wrap items-center justify-between gap-[12px]">
              <p className="inline-flex items-center gap-[6px] text-[12px] text-[var(--color-text-soft)]">
                <RiInformationLine size={14} />
                Your most recent usage data can take up to 24 hours to refresh.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-[8px]"
                leadingIcon={<RiDownload2Line size={14} />}
              >
                Download report
              </Button>
            </footer>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[8px]">
      <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function FilterInput({ websites }: { websites: string[] }) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [open, setOpen] = React.useState(false);

  const displayText =
    selected.length === 0
      ? ""
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "group flex h-[44px] w-full items-center rounded-[8px] bg-[var(--color-bg-surface)]",
          "ring-1 ring-[var(--color-stroke-soft)]",
          "transition-[box-shadow,background-color] duration-150",
          "hover:ring-[var(--color-stroke-sub)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
        )}
      >
        <span
          className={cn(
            "flex-1 truncate px-[14px] text-left text-[14px] leading-[20px]",
            displayText
              ? "text-[var(--color-text-strong)]"
              : "text-[var(--color-text-soft)]",
          )}
        >
          {displayText || "Filter"}
        </span>
        <span
          aria-hidden
          className={cn(
            "mr-[6px] flex size-[32px] items-center justify-center rounded-[6px]",
            "text-[var(--color-text-soft)] transition-colors",
            "group-hover:bg-white/5 group-hover:text-[var(--color-text-strong)]",
          )}
        >
          <RiArrowRightLine size={16} />
        </span>
      </button>

      <FilterWebsitesModal
        open={open}
        onOpenChange={setOpen}
        items={websites}
        value={selected}
        onChange={setSelected}
      />
    </>
  );
}

function TotalSummary({
  data,
  unit,
  label,
}: {
  data: UsagePoint[];
  unit: string;
  label: string;
}) {
  const total = React.useMemo(
    () => data.reduce((acc, d) => acc + d.value, 0),
    [data],
  );
  const peak = React.useMemo(
    () => (data.length ? Math.max(...data.map((d) => d.value)) : 0),
    [data],
  );
  const animated = useCountUp(total);
  const animatedPeak = useCountUp(peak);

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
      <div className="flex items-baseline gap-[8px]">
        <span className="tp-overline text-[var(--color-text-soft)]">
          {label} total
        </span>
        <span className="text-[28px] font-semibold leading-[32px] tabular-nums text-[var(--color-text-strong)]">
          {Math.round(animated).toLocaleString("en-US")}
        </span>
        <span className="text-[13px] text-[var(--color-text-soft)]">
          {unit}
        </span>
      </div>
      <div className="flex items-baseline gap-[6px] text-[12px]">
        <span className="text-[var(--color-text-soft)]">Peak</span>
        <span className="font-semibold tabular-nums text-[var(--color-brand-400)]">
          {Math.round(animatedPeak).toLocaleString("en-US")}
        </span>
        <span className="text-[var(--color-text-soft)]">{unit}</span>
      </div>
    </div>
  );
}
