import Link from "next/link";
import {
  RiFolder3Line,
  RiArrowRightUpLine,
} from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { ClientAvatar } from "@/components/agency/client-avatar";
import { api } from "@/lib/agency/store";
import { cn } from "@/lib/cn";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function ProjectsPage() {
  const clients = api.listClients();

  return (
    <AppShell>
      <div className="flex items-center gap-[14px]">
        <span className="flex size-[44px] shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-400)]">
          <RiFolder3Line size={20} />
        </span>
        <div>
          <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
            Projects
          </h1>
          <p className="mt-[4px] text-[13px] text-[var(--color-text-soft)]">
            Per-client work streams. Runs are filed under projects.
          </p>
        </div>
      </div>

      <div className="enter-stagger mt-[24px] flex flex-col gap-[28px]">
        {clients.map((client) => {
          const projects = api.listProjects(client.id);
          if (projects.length === 0) return null;

          return (
            <section key={client.id} className="flex flex-col gap-[12px]">
              <header className="flex items-center gap-[10px]">
                <ClientAvatar
                  initials={client.initials}
                  accentColor={client.accentColor}
                  size={32}
                />
                <h2 className="text-[15px] font-semibold text-[var(--color-text-strong)]">
                  {client.name}
                </h2>
                <span className="text-[12px] text-[var(--color-text-soft)]">
                  {projects.length} project{projects.length === 1 ? "" : "s"}
                </span>
              </header>

              <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => {
                  const runs = api.listRuns({ projectId: p.id });
                  const shipped = runs.filter((r) => r.status === "shipped");
                  const effective = shipped.reduce(
                    (s, r) => s + r.baselineHours,
                    0,
                  );
                  const billable = shipped.reduce(
                    (s, r) => s + r.billableUsd,
                    0,
                  );
                  return (
                    <article
                      key={p.id}
                      className={cn(
                        "relative flex flex-col gap-[12px] overflow-hidden rounded-[12px] bg-[var(--color-bg-surface)] p-[20px] pt-[22px]",
                        "ring-1 ring-[var(--color-stroke-soft)] transition-colors",
                        "hover:ring-[var(--color-stroke-sub)]",
                      )}
                    >
                      <span
                        className="absolute inset-x-0 top-0 h-[4px]"
                        style={{ backgroundColor: p.color }}
                      />
                      <div className="flex items-start justify-between gap-[8px]">
                        <h3 className="text-[15px] font-semibold text-[var(--color-text-strong)]">
                          {p.name}
                        </h3>
                        <Link
                          href={`/agency/runs?projectId=${p.id}`}
                          className={cn(
                            "flex size-[28px] shrink-0 items-center justify-center rounded-[6px]",
                            "text-[var(--color-text-soft)] hover:bg-white/5 hover:text-[var(--color-text-strong)]",
                          )}
                          aria-label={`Open runs for ${p.name}`}
                        >
                          <RiArrowRightUpLine size={16} />
                        </Link>
                      </div>
                      {p.description ? (
                        <p className="line-clamp-2 text-[13px] text-[var(--color-text-soft)]">
                          {p.description}
                        </p>
                      ) : null}

                      <div className="mt-auto grid grid-cols-3 gap-[8px] rounded-[10px] bg-[color-mix(in_oklab,white_2%,transparent)] p-[12px] ring-1 ring-[var(--color-stroke-soft)]">
                        <Mini label="Runs" value={`${runs.length}`} />
                        <Mini
                          label="Eff. hours"
                          value={`${effective.toFixed(0)}h`}
                        />
                        <Mini
                          label="Billable"
                          value={usd.format(billable)}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
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
      <div className="mt-[2px] text-[14px] font-semibold tabular-nums text-[var(--color-text-strong)]">
        {value}
      </div>
    </div>
  );
}
