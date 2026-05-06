import Link from "next/link";
import { RiBarChartBoxLine } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import {
  LeverageAreaChart,
  MarginBarChart,
  type LeverageDailyPoint,
} from "@/components/agency/leverage-chart";
import { api } from "@/lib/agency/store";
import { cn } from "@/lib/cn";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdExact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const DAY = 24 * 60 * 60 * 1000;

const WINDOWS = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

export default async function LeveragePage({
  searchParams,
}: {
  searchParams: Promise<{ windowDays?: string }>;
}) {
  const sp = await searchParams;
  const windowDays =
    sp?.windowDays && [7, 30, 90].includes(Number(sp.windowDays))
      ? Number(sp.windowDays)
      : 30;

  const lev = api.leverage(windowDays);
  const allRuns = api.listRuns();
  const skills = api.listSkills();

  const cutoff = Date.now() - windowDays * DAY;
  const runs = allRuns.filter(
    (r) => new Date(r.startedAt).getTime() >= cutoff && r.status === "shipped",
  );

  const buckets = new Map<string, { effective: number; runtime: number }>();
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY);
    const k = d.toISOString().slice(5, 10);
    buckets.set(k, { effective: 0, runtime: 0 });
  }
  runs.forEach((r) => {
    const k = r.startedAt.slice(5, 10);
    const b = buckets.get(k);
    if (b) {
      b.effective += r.baselineHours;
      b.runtime += r.runtimeSec / 3600;
    }
  });
  const series: LeverageDailyPoint[] = Array.from(buckets.entries()).map(
    ([date, v]) => ({
      date,
      effective: Number(v.effective.toFixed(2)),
      runtime: Number(v.runtime.toFixed(2)),
    }),
  );

  const skillTotals = new Map<string, number>();
  runs.forEach((r) => {
    skillTotals.set(
      r.skillId,
      (skillTotals.get(r.skillId) ?? 0) + r.baselineHours,
    );
  });
  const topSkills = Array.from(skillTotals.entries())
    .map(([skillId, hours]) => ({
      skill: skills.find((s) => s.id === skillId),
      hours,
      runs: runs.filter((r) => r.skillId === skillId).length,
    }))
    .filter((r) => r.skill)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <div className="flex items-center gap-[14px]">
          <span className="flex size-[44px] shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-400)]">
            <RiBarChartBoxLine size={20} />
          </span>
          <div>
            <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
              Leverage
            </h1>
            <p className="mt-[4px] text-[13px] text-[var(--color-text-soft)]">
              How much human-equivalent work the agents shipped — and the margin
              you keep.
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-[8px] bg-[var(--color-bg-surface)] p-[4px] ring-1 ring-[var(--color-stroke-soft)]">
          {WINDOWS.map((w) => (
            <Link
              key={w.value}
              href={`/agency/leverage?windowDays=${w.value}`}
              className={cn(
                "rounded-[6px] px-[12px] py-[6px] text-[12px] font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
                w.value === windowDays
                  ? "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]"
                  : "text-[var(--color-text-soft)] hover:text-[var(--color-text-strong)]",
              )}
            >
              {w.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="enter-stagger mt-[24px] grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-4">
        <Hero
          label="Effective hours"
          value={`${lev.effectiveHours.toFixed(0)}h`}
          sub="human-equivalent shipped"
        />
        <Hero
          label="Leverage"
          value={`${lev.multiplier.toFixed(1)}×`}
          sub={`vs ${lev.runtimeHours.toFixed(1)}h runtime`}
          accent
        />
        <Hero
          label="Margin"
          value={usd.format(lev.marginUsd)}
          sub={`${lev.marginPct.toFixed(1)}% of billable`}
          pill={`${lev.marginPct.toFixed(0)}%`}
        />
        <Hero
          label="Runs"
          value={`${lev.runs}`}
          sub={`shipped in ${windowDays}d`}
        />
      </div>

      <div className="mt-[20px] grid grid-cols-1 gap-[16px] lg:grid-cols-2">
        <Card title="Effective vs Runtime" subtitle="hours per day, shipped runs">
          <div className="mb-[12px] flex items-center gap-[16px]">
            <Legend color="var(--color-brand-400)" label="Effective" />
            <Legend color="#38bdf8" label="Runtime" />
          </div>
          <LeverageAreaChart data={series} />
        </Card>
        <Card title="Margin breakdown" subtitle="billable vs cost">
          <MarginBarChart billable={lev.billableUsd} cost={lev.costUsd} />
        </Card>
      </div>

      <div className="mt-[20px] rounded-[12px] bg-[var(--color-bg-surface)] p-[20px] ring-1 ring-[var(--color-stroke-soft)]">
        <header className="mb-[12px] flex items-center justify-between">
          <h2 className="tp-overline text-[var(--color-brand-400)]">
            Top skills by effective hours
          </h2>
          <span className="text-[11px] text-[var(--color-text-soft)]">
            window · {windowDays}d
          </span>
        </header>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[480px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
                <th className="px-[12px] pb-[10px] font-semibold">Skill</th>
                <th className="px-[12px] pb-[10px] font-semibold">Runs</th>
                <th className="px-[12px] pb-[10px] text-right font-semibold">
                  Effective hours
                </th>
              </tr>
            </thead>
            <tbody>
              {topSkills.map((row) => (
                <tr
                  key={row.skill!.id}
                  className="border-t border-[var(--color-stroke-soft)]"
                >
                  <td className="px-[12px] py-[12px] font-semibold text-[var(--color-text-strong)]">
                    {row.skill!.name}
                  </td>
                  <td className="px-[12px] py-[12px] tabular-nums text-[var(--color-text-sub)]">
                    {row.runs}
                  </td>
                  <td className="px-[12px] py-[12px] text-right font-semibold tabular-nums text-[var(--color-text-strong)]">
                    {row.hours.toFixed(1)}h
                  </td>
                </tr>
              ))}
              {topSkills.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-[12px] py-[32px] text-center">
                    <div className="text-[13px] font-semibold text-[var(--color-text-strong)]">
                      No shipped runs in this window
                    </div>
                    <div className="mt-[2px] text-[12px] text-[var(--color-text-soft)]">
                      Widen the window to {windowDays === 7 ? "30d" : "90d"} or
                      ship a run to see leverage build up.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-[12px] text-[11px] text-[var(--color-text-soft)] tabular-nums">
        Cost (model spend) in window: {usdExact.format(lev.costUsd)} · Billable:{" "}
        {usdExact.format(lev.billableUsd)}
      </p>
    </AppShell>
  );
}

function Hero({
  label,
  value,
  sub,
  accent,
  pill,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  pill?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] bg-[var(--color-bg-surface)] p-[20px] ring-1 ring-[var(--color-stroke-soft)]",
        accent && "ring-[color-mix(in_oklab,var(--color-brand-400)_28%,transparent)]",
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
          {label}
        </span>
        {pill ? (
          <span className="inline-flex rounded-[6px] bg-[color-mix(in_oklab,var(--color-accent-green)_18%,transparent)] px-[8px] py-[2px] text-[11px] font-semibold text-emerald-300 ring-1 ring-[color-mix(in_oklab,var(--color-accent-green)_28%,transparent)] tabular-nums">
            {pill}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "mt-[10px] text-[34px] font-semibold leading-[40px] tabular-nums",
          accent
            ? "text-[var(--color-brand-400)]"
            : "text-[var(--color-text-strong)]",
        )}
      >
        {value}
      </div>
      <div className="mt-[4px] text-[12px] text-[var(--color-text-soft)]">
        {sub}
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[12px] bg-[var(--color-bg-surface)] p-[20px] ring-1 ring-[var(--color-stroke-soft)]">
      <header className="mb-[12px] flex items-baseline justify-between">
        <h2 className="tp-overline text-[var(--color-brand-400)]">{title}</h2>
        {subtitle ? (
          <span className="text-[11px] text-[var(--color-text-soft)]">
            {subtitle}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-[6px] text-[12px] text-[var(--color-text-soft)]">
      <span
        className="size-[8px] rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
