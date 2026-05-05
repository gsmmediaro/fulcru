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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UsageChart, type UsagePoint } from "@/components/home/usage-chart";
import { useCountUp } from "@/lib/use-count-up";
import { FilterWebsitesModal } from "@/components/home/filter-websites-modal";

const SAMPLE_WEBSITES = [
  "google.com",
  "youtube.com",
  "amazon.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "reddit.com",
  "github.com",
  "tiktok.com",
  "cloudflare.com",
];

const DATA: UsagePoint[] = [
  { date: "04-30", value: 320 },
  { date: "05-1", value: 540 },
  { date: "05-2", value: 470 },
  { date: "05-3", value: 280 },
  { date: "05-4", value: 132 },
  { date: "05-5", value: 38 },
];

export function ProxyStatistics({ productLabel }: { productLabel: string }) {
  const [unit, setUnit] = React.useState("MB");
  const [period, setPeriod] = React.useState("2026-04-30 – 2026-05-05");
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
      <header className="mb-[20px] flex flex-wrap items-center justify-between gap-[8px] sm:gap-[12px]">
        <h2 className="tp-overline text-[var(--color-brand-400)]">
          My statistics
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

      <div className="grid grid-cols-1 gap-[12px] sm:gap-[16px] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,180px)]">
        <Field label="Select a period">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger leadingIcon={<RiCalendar2Line size={16} />}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026-04-30 – 2026-05-05">
                2026-04-30 – 2026-05-05
              </SelectItem>
              <SelectItem value="Last 7 days">Last 7 days</SelectItem>
              <SelectItem value="Last 30 days">Last 30 days</SelectItem>
              <SelectItem value="This month">This month</SelectItem>
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

      <div className="mt-[28px]">
        <TotalSummary data={DATA} unit={unit} label={productLabel} />
        <div key={refreshKey} className="chart-draw mt-[12px]">
          <UsageChart data={DATA} unit={unit} />
        </div>
      </div>

      <footer className="mt-[24px] flex flex-wrap items-center justify-between gap-[12px]">
        <p className="inline-flex items-center gap-[6px] text-[12px] text-[var(--color-text-soft)]">
          <RiInformationLine size={14} />
          It might take up to 24 hours for your most recent usage data to refresh.
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
