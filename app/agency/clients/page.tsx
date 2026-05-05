import Link from "next/link";
import { RiBriefcase4Line, RiAddLine, RiArrowRightLine } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ClientAvatar } from "@/components/agency/client-avatar";
import { api } from "@/lib/agency/store";
import { cn } from "@/lib/cn";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const DAY = 24 * 60 * 60 * 1000;

export default function ClientsPage() {
  const clients = api.listClients();
  const cutoff = Date.now() - 30 * DAY;

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <div className="flex items-center gap-[14px]">
          <span className="flex size-[44px] shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-400)]">
            <RiBriefcase4Line size={20} />
          </span>
          <div>
            <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
              Clients
            </h1>
            <p className="mt-[4px] text-[13px] text-[var(--color-text-soft)]">
              The companies the agency ships work for.
            </p>
          </div>
        </div>
        <Button variant="outline" leadingIcon={<RiAddLine size={16} />}>
          New client
        </Button>
      </div>

      <div className="enter-stagger mt-[24px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((c) => {
          const runs = api.listRuns({ clientId: c.id });
          const projects = api.listProjects(c.id);
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
                "flex flex-col gap-[16px] rounded-[12px] bg-[var(--color-bg-surface)] p-[20px]",
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
                      {projects.length} project{projects.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-[8px] rounded-[10px] bg-[color-mix(in_oklab,white_2%,transparent)] p-[12px] ring-1 ring-[var(--color-stroke-soft)]">
                <Mini label="Active runs" value={`${activeRuns}`} />
                <Mini
                  label="Eff. hours · 30d"
                  value={`${effectiveHours.toFixed(0)}h`}
                />
                <Mini
                  label="Billable · 30d"
                  value={usd.format(billable)}
                />
              </div>

              <Link
                href={`/agency/runs?clientId=${c.id}`}
                className="inline-flex items-center gap-[6px] self-start text-[13px] font-semibold text-[var(--color-brand-400)] hover:underline"
              >
                View runs <RiArrowRightLine size={14} />
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
