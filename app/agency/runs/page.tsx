import { RiPulseLine } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { getApi } from "@/lib/agency/server-api";
import { KpiCard } from "@/components/agency/kpi-card";
import { RunsTable } from "@/components/agency/runs-table";
import { formatCurrency } from "@/lib/agency/format";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/cn";

export default async function RunsPage() {
  const { t } = await getT();
  const api = await getApi();
  const [runs, clients, projects, skills, leverage7] = await Promise.all([
    api.listRuns(),
    api.listClients(),
    api.listProjects(),
    api.listSkills(),
    api.leverage(7),
  ]);

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
          <h1 className="text-[26px] font-semibold leading-[32px] tracking-tight sm:text-[28px] sm:leading-[34px]">
            {t("runs.title")}
          </h1>
          <p className="mt-[2px] text-[13px] text-[var(--color-text-soft)]">
            {t("runs.subtitle")}
          </p>
        </div>
      </div>

      <div className="enter-stagger mt-[24px] flex flex-col gap-[16px] sm:gap-[20px]">
        <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t("runs.kpi.active")}
            value={activeRuns}
            hint={t("runs.kpi.activeHint")}
          />
          <KpiCard
            label={t("runs.kpi.awaiting")}
            value={awaiting}
            deltaTone={awaiting > 0 ? "negative" : "neutral"}
            delta={
              awaiting > 0
                ? t("runs.kpi.awaiting.needs")
                : t("runs.kpi.awaiting.clear")
            }
          />
          <KpiCard
            label={t("runs.kpi.eff")}
            value={`${effectiveHours24.toFixed(0)}h`}
            hint={t("runs.kpi.effHint", { n: last24Shipped.length })}
          />
          <KpiCard
            label={t("runs.kpi.margin")}
            value={formatCurrency(margin24, 0)}
            deltaTone="positive"
            delta={t("runs.kpi.marginDelta", { x: leverage7.multiplier })}
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
