import { RiPulseLine } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { api } from "@/lib/agency/store";
import { KpiCard } from "@/components/agency/kpi-card";
import { RunsTable } from "@/components/agency/runs-table";
import { formatCurrency } from "@/lib/agency/format";
import { cn } from "@/lib/cn";

export default function RunsPage() {
  const runs = api.listRuns();
  const clients = api.listClients();
  const projects = api.listProjects();
  const skills = api.listSkills();

  const activeRuns = runs.filter((r) => r.status === "running").length;
  const awaiting = runs.filter((r) => r.status === "awaiting_approval").length;

  const cutoff = Date.now() - 24 * 3600_000;
  const last24Shipped = runs.filter(
    (r) =>
      r.status === "shipped" &&
      r.endedAt &&
      new Date(r.endedAt).getTime() >= cutoff,
  );
  const effectiveHours24 = last24Shipped.reduce(
    (s, r) => s + r.baselineHours,
    0,
  );
  const margin24 =
    last24Shipped.reduce((s, r) => s + r.billableUsd, 0) -
    last24Shipped.reduce((s, r) => s + r.costUsd, 0);

  const leverage7 = api.leverage(7);

  return (
    <AppShell>
      <div className="flex items-center gap-[14px]">
        <span
          className={cn(
            "flex size-[44px] shrink-0 items-center justify-center rounded-full",
            "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
          )}
        >
          <RiPulseLine size={20} />
        </span>
        <div className="flex flex-col">
          <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
            Runs
          </h1>
          <p className="mt-[2px] text-[13px] text-[var(--color-text-soft)]">
            Live agent runs and the billable work they produce.
          </p>
        </div>
      </div>

      <div className="enter-stagger mt-[24px] flex flex-col gap-[16px] sm:gap-[20px]">
        <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Active runs"
            value={activeRuns}
            hint="agents working right now"
          />
          <KpiCard
            label="Awaiting approval"
            value={awaiting}
            deltaTone={awaiting > 0 ? "negative" : "neutral"}
            delta={awaiting > 0 ? "needs review" : "clear"}
          />
          <KpiCard
            label="Effective hours · 24h"
            value={`${effectiveHours24.toFixed(0)}h`}
            hint={`${last24Shipped.length} runs shipped`}
          />
          <KpiCard
            label="Margin · 24h"
            value={formatCurrency(margin24, 0)}
            deltaTone="positive"
            delta={`${leverage7.multiplier}× leverage · 7d`}
          />
        </div>

        <RunsTable
          runs={runs}
          clients={clients}
          projects={projects}
          skills={skills}
        />
      </div>
    </AppShell>
  );
}
