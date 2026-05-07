import Link from "next/link";
import { RiBriefcase4Line, RiArrowRightLine } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { ClientAvatar } from "@/components/agency/client-avatar";
import { NewClientButton } from "@/components/agency/new-client-modal";
import { ClientEditButton } from "@/components/agency/client-edit-button";
import { getApi } from "@/lib/agency/server-api";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/cn";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const DAY = 24 * 60 * 60 * 1000;

export default async function ClientsPage() {
  const { t } = await getT();
  const api = await getApi();
  const clients = await api.listClients();
  const cutoff = Date.now() - 30 * DAY;
  const perClient = await Promise.all(
    clients.map(async (c) => ({
      runs: await api.listRuns({ clientId: c.id }),
      projects: await api.listProjects(c.id),
    })),
  );

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <div className="flex items-center gap-[14px]">
          <span className="flex size-[44px] shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-400)]">
            <RiBriefcase4Line size={20} />
          </span>
          <div className="flex flex-col">
            <h1 className="text-[26px] font-semibold leading-[32px] tracking-tight sm:text-[28px] sm:leading-[34px]">
              {t("clients.title")}
            </h1>
            <p className="mt-[2px] text-[13px] leading-[18px] text-[var(--color-text-soft)]">
              {t("clients.subtitle")}
            </p>
          </div>
        </div>
        <NewClientButton />
      </div>

      <div className="enter-stagger mt-[24px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((c, i) => {
          const { runs, projects } = perClient[i];
          const activeRuns = runs.filter(
            (r) => r.status === "running" || r.status === "awaiting_approval",
          ).length;
          const recent = runs.filter(
            (r) =>
              new Date(r.startedAt).getTime() >= cutoff && r.status === "shipped",
          );
          const effectiveHours = recent.reduce(
            (s, r) => s + r.baselineHours,
            0,
          );
          const billable = recent.reduce((s, r) => s + r.billableUsd, 0);

          return (
            <article
              key={c.id}
              className={cn(
                "flex flex-col gap-[16px] rounded-[8px] bg-[var(--color-bg-surface)] p-[20px]",
                "ring-1 ring-[var(--color-stroke-soft)] transition-colors",
                "hover:ring-[var(--color-stroke-sub)]",
              )}
            >
              <div className="flex items-start gap-[14px]">
                <ClientAvatar
                  initials={c.initials}
                  accentColor={c.accentColor}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="truncate text-[17px] font-semibold text-[var(--color-text-strong)]">
                    {c.name}
                  </h3>
                  <div className="mt-[6px] flex items-center gap-[8px]">
                    <span className="inline-flex rounded-[6px] bg-[color-mix(in_oklab,white_4%,transparent)] px-[8px] py-[2px] text-[11px] font-semibold text-[var(--color-text-sub)] ring-1 ring-[var(--color-stroke-soft)] tabular-nums">
                      {usd.format(c.hourlyRate)}/h
                    </span>
                    <span className="text-[11px] text-[var(--color-text-soft)]">
                      {t(
                        projects.length === 1
                          ? "clients.projectsCount"
                          : "clients.projectsCountPl",
                        { n: projects.length },
                      )}
                    </span>
                  </div>
                </div>
                <ClientEditButton client={c} />
              </div>

              <div className="grid grid-cols-3 gap-[8px] rounded-[6px] bg-[color-mix(in_oklab,white_2%,transparent)] p-[12px] ring-1 ring-[var(--color-stroke-soft)]">
                <Mini label={t("clients.activeRuns")} value={`${activeRuns}`} />
                <Mini
                  label={t("clients.eff30")}
                  value={`${effectiveHours.toFixed(0)}h`}
                />
                <Mini
                  label={t("clients.bill30")}
                  value={usd.format(billable)}
                />
              </div>

              <Link
                href={`/agency/runs?clientId=${c.id}`}
                className="inline-flex items-center gap-[6px] self-start text-[13px] font-semibold text-[var(--color-brand-400)] hover:underline"
              >
                {t("clients.viewRuns")} <RiArrowRightLine size={14} />
              </Link>
            </article>
          );
        })}
      </div>
    </AppShell>
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
