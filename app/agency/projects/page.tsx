import Link from "next/link";
import { RiFolder3Line, RiArrowRightLine } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { NewProjectButton } from "@/components/agency/new-project-modal";
import { EmptyState } from "@/components/agency/empty-state";
import { getApi } from "@/lib/agency/server-api";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/cn";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function ProjectsPage() {
  const { t } = await getT();
  const api = await getApi();
  const [clients, projects] = await Promise.all([
    api.listClients(),
    api.listProjects(),
  ]);
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const runsByProject = await Promise.all(
    projects.map((p) => api.listRuns({ projectId: p.id })),
  );

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <div className="flex items-center gap-[14px]">
          <span className="flex size-[44px] shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-400)]">
            <RiFolder3Line size={20} />
          </span>
          <div className="flex flex-col">
            <h1 className="text-[26px] font-semibold leading-[32px] tracking-tight sm:text-[28px] sm:leading-[34px]">
              {t("projects.title")}
            </h1>
            <p className="mt-[2px] text-[13px] leading-[18px] text-[var(--color-text-soft)]">
              {t("projects.subtitle")}
            </p>
          </div>
        </div>
        <NewProjectButton clients={clients} />
      </div>

      {projects.length === 0 ? (
        <div className="enter-stagger mt-[24px]">
          <EmptyState
            icon={<RiFolder3Line size={22} />}
            title={t("projects.empty.title")}
            description={t("projects.empty.body")}
            action={<NewProjectButton clients={clients} />}
          />
        </div>
      ) : (
        <div className="enter-stagger mt-[24px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p, i) => {
          const client = clientById.get(p.clientId);
          const runs = runsByProject[i];
          const shipped = runs.filter((r) => r.status === "shipped");
          const effective = shipped.reduce(
            (s, r) => s + r.baselineHours,
            0,
          );
          const billable = shipped.reduce((s, r) => s + r.billableUsd, 0);

          return (
            <article
              key={p.id}
              className={cn(
                "flex flex-col gap-[16px] rounded-[8px] bg-[var(--color-bg-surface)] p-[20px]",
                "ring-1 ring-[var(--color-stroke-soft)] transition-colors",
                "hover:ring-[var(--color-stroke-sub)]",
              )}
            >
              <div className="flex items-start gap-[14px]">
                <ProjectBadge color={p.color} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="truncate text-[17px] font-semibold text-[var(--color-text-strong)]">
                    {p.name}
                  </h3>
                  <div className="mt-[6px] flex items-center gap-[8px]">
                    <span
                      className="inline-flex items-center gap-[6px] rounded-[4px] px-[8px] py-[2px] text-[11px] font-semibold ring-1 ring-[var(--color-stroke-soft)] tabular-nums"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${p.color} 16%, transparent)`,
                        color: p.color,
                      }}
                    >
                      <span
                        aria-hidden
                        className="size-[6px] rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      {client?.name ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-[8px] rounded-[6px] bg-[color-mix(in_oklab,white_2%,transparent)] p-[12px] ring-1 ring-[var(--color-stroke-soft)]">
                <Mini label={t("projects.runs")} value={`${runs.length}`} />
                <Mini
                  label={t("projects.eff")}
                  value={`${effective.toFixed(0)}h`}
                />
                <Mini label={t("projects.bill")} value={usd.format(billable)} />
              </div>

              <Link
                href={`/agency/runs?projectId=${p.id}`}
                className="inline-flex items-center gap-[6px] self-start text-[13px] font-semibold text-[var(--color-brand-400)] hover:underline"
              >
                {t("projects.viewRuns")} <RiArrowRightLine size={14} />
              </Link>
            </article>
          );
        })}
        </div>
      )}
    </AppShell>
  );
}

function ProjectBadge({ color }: { color: string }) {
  return (
    <span
      className="flex size-[56px] shrink-0 items-center justify-center rounded-[6px] ring-1"
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 22%, #1a1a1a)`,
        color,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 35%, transparent)`,
      }}
    >
      <RiFolder3Line size={22} />
    </span>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
        {label}
      </div>
      <div className="mt-[2px] text-[15px] font-semibold tabular-nums text-[var(--color-text-strong)]">
        {value}
      </div>
    </div>
  );
}
