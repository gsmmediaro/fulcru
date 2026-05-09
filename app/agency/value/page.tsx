import Link from "next/link";
import { RiFileChart2Line, RiArrowRightLine } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { ClientAvatar } from "@/components/agency/client-avatar";
import {
  ValueReportFilters,
  type WindowKey,
} from "@/components/agency/value-report";
import { getApi } from "@/lib/agency/server-api";
import {
  bucketLabel,
  categoryColor,
  categoryLabel,
  difficultyBucket,
} from "@/lib/agency/scoring";
import { formatCurrency } from "@/lib/agency/format";
import { cn } from "@/lib/cn";
import type {
  ChangeCategory,
  Client,
  DifficultyBucket,
  Run,
} from "@/lib/agency/types";

const DAY_MS = 24 * 60 * 60 * 1000;

const WINDOW_LABEL: Record<WindowKey, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  ytd: "year to date",
};

const DIFFICULTY_BUCKETS: DifficultyBucket[] = [
  "trivial",
  "normal",
  "moderate",
  "hard",
  "very_hard",
];

const BUCKET_COLOR: Record<DifficultyBucket, string> = {
  trivial: "#94A3B8",
  normal: "#0EA5E9",
  moderate: "#F59E0B",
  hard: "#EF4444",
  very_hard: "#A78BFA",
};

function parseWindow(value: string | undefined): WindowKey {
  if (value === "7d" || value === "30d" || value === "90d" || value === "ytd") {
    return value;
  }
  return "30d";
}

function windowSinceIso(key: WindowKey): string {
  if (key === "ytd") {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
  }
  const days = key === "7d" ? 7 : key === "30d" ? 30 : 90;
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function formatHm(activeSec: number): string {
  const totalMin = Math.floor(activeSec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

type CategoryStats = {
  category: ChangeCategory | "uncategorized";
  count: number;
  activeSec: number;
  billable: number;
};

function aggregateCategories(runs: Run[]): CategoryStats[] {
  const map = new Map<string, CategoryStats>();
  for (const r of runs) {
    const key = r.changeCategory ?? "uncategorized";
    const cur =
      map.get(key) ??
      ({
        category: key as ChangeCategory | "uncategorized",
        count: 0,
        activeSec: 0,
        billable: 0,
      } as CategoryStats);
    cur.count += 1;
    cur.activeSec += r.activeSec;
    cur.billable += r.billableUsd;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.activeSec - a.activeSec);
}

function categoryDisplay(c: ChangeCategory | "uncategorized"): string {
  if (c === "uncategorized") return "Uncategorized";
  return categoryLabel(c);
}

function categoryHex(c: ChangeCategory | "uncategorized"): string {
  if (c === "uncategorized") return "#94A3B8";
  return categoryColor(c);
}

export default async function ValueReportPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; clientId?: string }>;
}) {
  const sp = await searchParams;
  const windowKey = parseWindow(sp?.window);
  const clientId = sp?.clientId && sp.clientId.trim() ? sp.clientId : null;

  const api = await getApi();
  const [clients, settings] = await Promise.all([
    api.listClients(),
    api.getSettings(),
  ]);

  const sinceDate = windowSinceIso(windowKey);
  const allRuns = await api.listRuns({
    clientId: clientId ?? undefined,
    sinceDate,
  });
  const shipped = allRuns.filter((r) => r.status === "shipped");

  const currency = settings.businessCurrency || "USD";
  const multiplier = settings.billActiveMultiplier ?? 1;
  const selectedClient = clientId
    ? (clients.find((c) => c.id === clientId) ?? null)
    : null;

  // KPIs
  const activeSecTotal = shipped.reduce((s, r) => s + r.activeSec, 0);
  const activeHours = activeSecTotal / 3600;
  const humanEquivalentHours = activeHours * multiplier;
  const billableUsd = shipped.reduce((s, r) => s + r.billableUsd, 0);
  const qualityAdjusted = shipped.reduce(
    (s, r) => s + r.billableUsd * (r.qualityConfidence ?? 1),
    0,
  );
  const weightDenom = billableUsd;
  const avgQuality =
    weightDenom > 0
      ? shipped.reduce(
          (s, r) =>
            s + (r.qualityConfidence ?? 1) * r.billableUsd,
          0,
        ) / weightDenom
      : shipped.length > 0
        ? shipped.reduce((s, r) => s + (r.qualityConfidence ?? 1), 0) /
          shipped.length
        : 1;

  // Category aggregation (over shipped runs in scope)
  const cats = aggregateCategories(shipped);
  const totalActiveSec = activeSecTotal || 1;

  // Difficulty distribution
  const bucketCounts: Record<DifficultyBucket, number> = {
    trivial: 0,
    normal: 0,
    moderate: 0,
    hard: 0,
    very_hard: 0,
  };
  for (const r of shipped) {
    const b = difficultyBucket(r.difficultyScore);
    if (b) bucketCounts[b] += 1;
  }
  const maxBucket = Math.max(1, ...Object.values(bucketCounts));

  // Per-client table data (only when no client selected)
  type ClientRow = {
    client: Client;
    runs: number;
    activeSec: number;
    billable: number;
    qualityAdjusted: number;
    avgQuality: number;
    topCategory: ChangeCategory | "uncategorized" | null;
  };
  let perClientRows: ClientRow[] = [];
  if (!clientId) {
    perClientRows = clients
      .map((c): ClientRow => {
        const rs = shipped.filter((r) => r.clientId === c.id);
        const activeSec = rs.reduce((s, r) => s + r.activeSec, 0);
        const bill = rs.reduce((s, r) => s + r.billableUsd, 0);
        const qa = rs.reduce(
          (s, r) => s + r.billableUsd * (r.qualityConfidence ?? 1),
          0,
        );
        const aq =
          bill > 0
            ? rs.reduce(
                (s, r) => s + (r.qualityConfidence ?? 1) * r.billableUsd,
                0,
              ) / bill
            : rs.length > 0
              ? rs.reduce((s, r) => s + (r.qualityConfidence ?? 1), 0) /
                rs.length
              : 1;
        const catAgg = aggregateCategories(rs);
        return {
          client: c,
          runs: rs.length,
          activeSec,
          billable: bill,
          qualityAdjusted: qa,
          avgQuality: aq,
          topCategory: catAgg[0]?.category ?? null,
        };
      })
      .filter((row) => row.runs > 0)
      .sort((a, b) => b.billable - a.billable);
  }

  // Impact narrative (per-client view only)
  const impactRuns = clientId
    ? shipped
        .filter((r) => r.impactNote && r.impactNote.trim().length > 0)
        .sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        )
    : [];

  const windowText = WINDOW_LABEL[windowKey];

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-[16px]">
        <div className="flex items-center gap-[14px]">
          <span className="flex size-[44px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-brand-100)] text-[var(--color-brand-400)]">
            <RiFileChart2Line size={20} />
          </span>
          <div className="flex max-w-[560px] flex-col">
            <h1 className="text-[26px] font-semibold leading-[32px] tracking-tight sm:text-[28px] sm:leading-[34px]">
              Value Report
            </h1>
            <p className="mt-[2px] text-[13px] leading-[18px] text-[var(--color-text-soft)]">
              What your clients got for the time they paid for. Generate
              snapshots to share with clients during renewal conversations.
            </p>
          </div>
        </div>
        <ValueReportFilters
          windowKey={windowKey}
          clientId={clientId}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>

      {/* Scope strip */}
      <div className="mt-[16px] flex flex-wrap items-center gap-[10px] text-[12px] text-[var(--color-text-soft)]">
        <span className="inline-flex items-center gap-[6px] rounded-[6px] bg-[var(--color-bg-surface)] px-[10px] py-[4px] ring-1 ring-[var(--color-stroke-soft)]">
          <span className="text-[var(--color-text-soft)]">Scope</span>
          <span className="font-semibold text-[var(--color-text-strong)]">
            {selectedClient ? selectedClient.name : "All clients"}
          </span>
        </span>
        <span className="inline-flex items-center gap-[6px] rounded-[6px] bg-[var(--color-bg-surface)] px-[10px] py-[4px] ring-1 ring-[var(--color-stroke-soft)]">
          <span className="text-[var(--color-text-soft)]">Window</span>
          <span className="font-semibold text-[var(--color-text-strong)]">
            {windowText}
          </span>
        </span>
        <span className="inline-flex items-center gap-[6px] rounded-[6px] bg-[var(--color-bg-surface)] px-[10px] py-[4px] ring-1 ring-[var(--color-stroke-soft)]">
          <span className="text-[var(--color-text-soft)]">Shipped runs</span>
          <span className="font-semibold tabular-nums text-[var(--color-text-strong)]">
            {shipped.length}
          </span>
        </span>
      </div>

      {/* KPI strip */}
      <div className="enter-stagger mt-[24px] grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Active hours"
          value={formatHm(activeSecTotal)}
          sub={`Across ${shipped.length} shipped runs`}
        />
        <Kpi
          label="Human-equivalent hours"
          value={`${humanEquivalentHours.toFixed(1)}h`}
          sub={
            multiplier > 1
              ? `(× ${multiplier.toFixed(2)} multiplier)`
              : "(pure active)"
          }
          accent
        />
        <Kpi
          label="Quality-adjusted billable"
          value={formatCurrency(qualityAdjusted, 0, currency)}
          sub={`Of ${formatCurrency(billableUsd, 0, currency)} raw billable`}
        />
        <Kpi
          label="Avg quality"
          value={`${avgQuality.toFixed(2)} / 1.00`}
          sub={
            shipped.length === 0
              ? "No data yet"
              : "Weighted by billable amount"
          }
          pill={
            avgQuality >= 0.95
              ? "Excellent"
              : avgQuality >= 0.85
                ? "Strong"
                : avgQuality >= 0.7
                  ? "Mixed"
                  : "Needs review"
          }
          pillTone={
            avgQuality >= 0.85
              ? "good"
              : avgQuality >= 0.7
                ? "neutral"
                : "warn"
          }
        />
      </div>

      {/* Category + Difficulty */}
      <div className="mt-[20px] grid grid-cols-1 gap-[16px] lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Where the time went"
          subtitle={`${windowText} - shipped only`}
        >
          {cats.length === 0 ? (
            <EmptyInline message="No shipped runs in this window." />
          ) : (
            <>
              <div className="flex h-[12px] w-full overflow-hidden rounded-[6px] bg-[var(--color-bg-tint-4)] ring-1 ring-[var(--color-stroke-soft)]">
                {cats.map((c) => {
                  const pct = (c.activeSec / totalActiveSec) * 100;
                  if (pct <= 0) return null;
                  return (
                    <span
                      key={c.category}
                      title={`${categoryDisplay(c.category)}: ${formatHm(c.activeSec)}`}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: categoryHex(c.category),
                      }}
                    />
                  );
                })}
              </div>

              <ul className="mt-[14px] flex flex-col gap-[8px]">
                {cats.map((c) => (
                  <li
                    key={c.category}
                    className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-[12px]"
                  >
                    <span
                      aria-hidden
                      className="size-[10px] shrink-0 rounded-[3px]"
                      style={{ backgroundColor: categoryHex(c.category) }}
                    />
                    <span className="truncate text-[13px] font-semibold text-[var(--color-text-strong)]">
                      {categoryDisplay(c.category)}
                    </span>
                    <span className="text-[12px] tabular-nums text-[var(--color-text-soft)]">
                      {c.count} {c.count === 1 ? "run" : "runs"}
                    </span>
                    <span className="min-w-[64px] text-right text-[13px] tabular-nums text-[var(--color-text-sub)]">
                      {formatHm(c.activeSec)}
                    </span>
                    <span className="min-w-[80px] text-right text-[13px] font-semibold tabular-nums text-[var(--color-text-strong)]">
                      {formatCurrency(c.billable, 0, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="Difficulty mix" subtitle="Run count by bucket">
          {shipped.length === 0 ? (
            <EmptyInline message="No data in this window." />
          ) : (
            <ul className="flex flex-col gap-[10px]">
              {DIFFICULTY_BUCKETS.map((b) => {
                const count = bucketCounts[b];
                const pct = (count / maxBucket) * 100;
                return (
                  <li key={b} className="flex flex-col gap-[4px]">
                    <div className="flex items-baseline justify-between gap-[8px]">
                      <span className="text-[12px] text-[var(--color-text-sub)]">
                        {bucketLabel(b)}
                      </span>
                      <span className="text-[12px] font-semibold tabular-nums text-[var(--color-text-strong)]">
                        {count}
                      </span>
                    </div>
                    <span
                      className="h-[6px] w-full rounded-full bg-[var(--color-bg-tint-4)]"
                      aria-hidden
                    >
                      <span
                        className="block h-full rounded-full transition-[width]"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: BUCKET_COLOR[b],
                        }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Per-client table OR impact narrative */}
      {!clientId ? (
        <div className="mt-[20px] rounded-[8px] bg-[var(--color-bg-surface)] p-[20px] ring-1 ring-[var(--color-stroke-soft)]">
          <header className="mb-[12px] flex items-center justify-between">
            <h2 className="tp-overline text-[var(--color-brand-400)]">
              Per-client breakdown
            </h2>
            <span className="text-[11px] text-[var(--color-text-soft)]">
              Sorted by billable, descending
            </span>
          </header>
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
                  <th className="px-[12px] pb-[10px] font-semibold">Client</th>
                  <th className="px-[12px] pb-[10px] text-right font-semibold">
                    Runs
                  </th>
                  <th className="px-[12px] pb-[10px] text-right font-semibold">
                    Active hours
                  </th>
                  <th className="px-[12px] pb-[10px] text-right font-semibold">
                    Human-equiv
                  </th>
                  <th className="px-[12px] pb-[10px] text-right font-semibold">
                    Billable
                  </th>
                  <th className="px-[12px] pb-[10px] text-right font-semibold">
                    Quality-adj
                  </th>
                  <th className="px-[12px] pb-[10px] text-right font-semibold">
                    Avg quality
                  </th>
                  <th className="px-[12px] pb-[10px] font-semibold">
                    Top category
                  </th>
                  <th className="px-[12px] pb-[10px]" />
                </tr>
              </thead>
              <tbody>
                {perClientRows.map((row) => {
                  const activeH = row.activeSec / 3600;
                  const heq = activeH * multiplier;
                  return (
                    <tr
                      key={row.client.id}
                      className="border-t border-[var(--color-stroke-soft)]"
                    >
                      <td className="px-[12px] py-[12px]">
                        <div className="flex items-center gap-[10px]">
                          <ClientAvatar
                            initials={row.client.initials}
                            accentColor={row.client.accentColor}
                            size={28}
                          />
                          <span className="truncate font-semibold text-[var(--color-text-strong)]">
                            {row.client.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-[12px] py-[12px] text-right tabular-nums text-[var(--color-text-sub)]">
                        {row.runs}
                      </td>
                      <td className="px-[12px] py-[12px] text-right tabular-nums text-[var(--color-text-strong)]">
                        {activeH.toFixed(1)}h
                      </td>
                      <td className="px-[12px] py-[12px] text-right tabular-nums text-[var(--color-text-sub)]">
                        {heq.toFixed(1)}h
                      </td>
                      <td className="px-[12px] py-[12px] text-right font-semibold tabular-nums text-[var(--color-text-strong)]">
                        {formatCurrency(row.billable, 0, currency)}
                      </td>
                      <td className="px-[12px] py-[12px] text-right tabular-nums text-[var(--color-text-sub)]">
                        {formatCurrency(row.qualityAdjusted, 0, currency)}
                      </td>
                      <td className="px-[12px] py-[12px] text-right tabular-nums text-[var(--color-text-sub)]">
                        {row.avgQuality.toFixed(2)}
                      </td>
                      <td className="px-[12px] py-[12px]">
                        {row.topCategory ? (
                          <CategoryBadge category={row.topCategory} />
                        ) : (
                          <span className="text-[12px] text-[var(--color-text-soft)]">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-[12px] py-[12px] text-right">
                        <Link
                          href={`/agency/value?clientId=${row.client.id}&window=${windowKey}`}
                          className="inline-flex items-center gap-[4px] text-[12px] font-semibold text-[var(--color-brand-400)] hover:underline"
                        >
                          Open
                          <RiArrowRightLine size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {perClientRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-[12px] py-[40px] text-center">
                      <div className="text-[13px] font-semibold text-[var(--color-text-strong)]">
                        No client activity in this window
                      </div>
                      <div className="mt-[2px] text-[12px] text-[var(--color-text-soft)]">
                        Widen the window or ship some runs to see per-client
                        value build up.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-[20px] rounded-[8px] bg-[var(--color-bg-surface)] p-[20px] ring-1 ring-[var(--color-stroke-soft)]">
          <header className="mb-[12px] flex items-center justify-between">
            <h2 className="tp-overline text-[var(--color-brand-400)]">
              Impact narrative
            </h2>
            <span className="text-[11px] text-[var(--color-text-soft)]">
              {selectedClient?.name ?? "Client"}, {windowText}
            </span>
          </header>
          {impactRuns.length === 0 ? (
            <div className="rounded-[6px] bg-[var(--color-bg-tint-2)] px-[16px] py-[28px] text-center ring-1 ring-[var(--color-stroke-soft)]">
              <div className="text-[13px] font-semibold text-[var(--color-text-strong)]">
                No impact notes yet
              </div>
              <p className="mx-auto mt-[4px] max-w-[420px] text-[12px] leading-[18px] text-[var(--color-text-soft)]">
                Add notes from the run detail page to make this report tell a
                story.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-[10px]">
              {impactRuns.map((r) => (
                <ImpactRow
                  key={r.id}
                  run={r}
                  currency={currency}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-[14px] text-[11px] text-[var(--color-text-soft)]">
        Values reflect shipped runs only. Quality-adjusted billable applies the
        per-run quality confidence. Billing style: {settings.billingStyle === "pure_active" ? "pure active" : "effort adjusted"}.
      </p>
    </AppShell>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
  pill,
  pillTone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  pill?: string;
  pillTone?: "good" | "neutral" | "warn";
}) {
  const pillClass =
    pillTone === "good"
      ? "bg-[color-mix(in_oklab,var(--color-accent-green)_18%,transparent)] text-emerald-300 ring-[color-mix(in_oklab,var(--color-accent-green)_28%,transparent)]"
      : pillTone === "warn"
        ? "bg-[color-mix(in_oklab,#EF4444_18%,transparent)] text-rose-300 ring-[color-mix(in_oklab,#EF4444_28%,transparent)]"
        : "bg-[var(--color-bg-tint-6)] text-[var(--color-text-sub)] ring-[var(--color-stroke-soft)]";
  return (
    <div
      className={cn(
        "rounded-[8px] bg-[var(--color-bg-surface)] p-[20px] ring-1 ring-[var(--color-stroke-soft)]",
        accent &&
          "ring-[color-mix(in_oklab,var(--color-brand-400)_28%,transparent)]",
      )}
    >
      <div className="flex items-start justify-between gap-[8px]">
        <span className="text-[11px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
          {label}
        </span>
        {pill ? (
          <span
            className={cn(
              "inline-flex shrink-0 rounded-[6px] px-[8px] py-[2px] text-[11px] font-semibold ring-1 tabular-nums",
              pillClass,
            )}
          >
            {pill}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "mt-[10px] text-[30px] font-semibold leading-[36px] tabular-nums sm:text-[34px] sm:leading-[40px]",
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
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[8px] bg-[var(--color-bg-surface)] p-[20px] ring-1 ring-[var(--color-stroke-soft)]",
        className,
      )}
    >
      <header className="mb-[12px] flex items-baseline justify-between gap-[8px]">
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

function EmptyInline({ message }: { message: string }) {
  return (
    <div className="rounded-[6px] bg-[var(--color-bg-tint-2)] px-[14px] py-[20px] text-center text-[12px] text-[var(--color-text-soft)] ring-1 ring-[var(--color-stroke-soft)]">
      {message}
    </div>
  );
}

function CategoryBadge({
  category,
}: {
  category: ChangeCategory | "uncategorized";
}) {
  const color = categoryHex(category);
  return (
    <span
      className="inline-flex items-center rounded-[4px] px-[8px] py-[2px] text-[11px] font-semibold"
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`,
        color,
      }}
    >
      {categoryDisplay(category)}
    </span>
  );
}

function ImpactRow({ run, currency }: { run: Run; currency: string }) {
  const cat = run.changeCategory ?? null;
  const dt = new Date(run.startedAt);
  const dateText = dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const prompt = (run.prompt ?? "Untitled run").trim();
  const truncated =
    prompt.length > 120 ? `${prompt.slice(0, 117)}...` : prompt;
  return (
    <li
      className={cn(
        "flex flex-col gap-[8px] rounded-[6px] px-[14px] py-[12px]",
        "bg-[var(--color-bg-tint-2)] ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <div className="flex flex-wrap items-center gap-[10px]">
        <Link
          href={`/agency/runs/${run.id}`}
          className="line-clamp-1 text-[13px] font-semibold text-[var(--color-text-strong)] hover:underline"
        >
          {truncated}
        </Link>
        {cat ? <CategoryBadge category={cat} /> : null}
      </div>
      <p className="text-[13px] italic leading-[20px] text-[var(--color-text-sub)]">
        {run.impactNote}
      </p>
      <div className="flex flex-wrap items-center gap-[12px] text-[11px] text-[var(--color-text-soft)] tabular-nums">
        <span>{dateText}</span>
        <span aria-hidden>·</span>
        <span>{formatHm(run.activeSec)}</span>
        <span aria-hidden>·</span>
        <span>{formatCurrency(run.billableUsd, 0, currency)}</span>
      </div>
    </li>
  );
}
