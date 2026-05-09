"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RiArrowRightLine,
  RiDeleteBinLine,
  RiEditLine,
  RiFolder3Line,
  RiMoreLine,
} from "@remixicon/react";
import { ProjectModal } from "@/components/agency/new-project-modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
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
  const [deletedIds, setDeletedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const visibleProjects = projects.filter((p) => !deletedIds.has(p.id));

  return (
    <>
      <div className="enter-stagger mt-[24px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
        {visibleProjects.map((p) => (
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
              <ProjectActionsMenu
                project={p}
                onEdit={() => setSelected(p)}
                onDeleted={(id) => {
                  setDeletedIds((current) => {
                    const next = new Set(current);
                    next.add(id);
                    return next;
                  });
                  setSelected((current) =>
                    current?.id === id ? null : current,
                  );
                }}
              />
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

function ProjectActionsMenu({
  project,
  onEdit,
  onDeleted,
}: {
  project: ProjectCard;
  onEdit: () => void;
  onDeleted: (id: string) => void;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  async function handleDelete() {
    setMenuOpen(false);
    const ok = await confirm({
      title: `Delete ${project.name}?`,
      description:
        "This permanently deletes the project, its runs, and its agent folder mappings. Expenses linked to it stay on the client without a project.",
      confirmLabel: "Delete project",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/agency/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onDeleted(project.id);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      ref={menuRef}
      className="relative z-[20] shrink-0"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label={`Actions for ${project.name}`}
        onClick={() => setMenuOpen((v) => !v)}
        className={cn(
          "flex size-[28px] items-center justify-center rounded-[6px]",
          "text-[var(--color-text-soft)] hover:text-[var(--color-text-strong)]",
          "hover:bg-[var(--color-bg-tint-6)]",
          "transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-[var(--color-brand-400)] focus-visible:outline-offset-2",
        )}
      >
        <RiMoreLine size={16} />
      </button>

      {menuOpen ? (
        <div
          className={cn(
            "absolute right-0 top-[calc(100%+4px)] z-[30]",
            "min-w-[150px] rounded-[8px] py-[4px]",
            "bg-[var(--color-bg-surface-elevated)]",
            "ring-1 ring-[var(--color-stroke-soft)]",
            "shadow-[0_8px_24px_rgb(0_0_0/0.32)]",
          )}
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onEdit();
            }}
            className={cn(
              "flex w-full items-center gap-[8px] px-[12px] py-[8px]",
              "text-[13px] font-medium text-[var(--color-text-strong)]",
              "hover:bg-[var(--color-bg-tint-5)]",
              "transition-colors duration-150",
            )}
          >
            <RiEditLine size={14} className="text-[var(--color-text-soft)]" />
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              "flex w-full items-center gap-[8px] px-[12px] py-[8px]",
              "text-[13px] font-medium text-rose-300",
              "hover:bg-[color-mix(in_oklab,#ef4444_12%,transparent)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-colors duration-150",
            )}
          >
            <RiDeleteBinLine size={14} />
            Delete project
          </button>
        </div>
      ) : null}
    </div>
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
