"use client";

import * as React from "react";
import Link from "next/link";
import { RiArrowRightLine, RiFolder3Line } from "@remixicon/react";
import { ProjectModal } from "@/components/agency/new-project-modal";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import type { Client, Project } from "@/lib/agency/types";

type ProjectCard = Project & {
  clientName: string;
  runsCount: number;
  effectiveHours: number;
  billableUsd: number;
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function ProjectsGrid({
  clients,
  projects,
}: {
  clients: Client[];
  projects: ProjectCard[];
}) {
  const { t } = useLocale();
  const [selected, setSelected] = React.useState<ProjectCard | null>(null);

  return (
    <>
      <div className="enter-stagger mt-[24px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <article
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(p)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelected(p);
              }
            }}
            className={cn(
              "flex cursor-pointer flex-col gap-[16px] rounded-[8px] bg-[var(--color-bg-surface)] p-[20px]",
              "ring-1 ring-[var(--color-stroke-soft)] transition-colors",
              "hover:ring-[var(--color-stroke-sub)]",
              "focus-visible:outline-2 focus-visible:outline-[var(--color-brand-400)] focus-visible:outline-offset-2",
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
                    {p.clientName}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-[8px] rounded-[6px] bg-[var(--color-bg-tint-2)] p-[12px] ring-1 ring-[var(--color-stroke-soft)]">
              <Mini label={t("projects.runs")} value={`${p.runsCount}`} />
              <Mini
                label={t("projects.eff")}
                value={`${p.effectiveHours.toFixed(0)}h`}
              />
              <Mini
                label={t("projects.bill")}
                value={usd.format(p.billableUsd)}
              />
            </div>

            <Link
              href={`/agency/runs?projectId=${p.id}`}
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center gap-[6px] self-start text-[13px] font-semibold text-[var(--color-brand-400)] hover:underline"
            >
              {t("projects.viewRuns")} <RiArrowRightLine size={14} />
            </Link>
          </article>
        ))}
      </div>

      {selected ? (
        <ProjectModal
          mode="edit"
          project={selected}
          clients={clients}
          open={Boolean(selected)}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onSaved={(project) => {
            setSelected((current) =>
              current ? { ...current, ...project } : current,
            );
          }}
        />
      ) : null}
    </>
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
