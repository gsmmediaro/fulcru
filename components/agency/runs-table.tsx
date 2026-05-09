"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { RiInboxLine, RiSearchLine } from "@remixicon/react";
import { cn } from "@/lib/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { Client, Project, Run, RunStatus, Skill } from "@/lib/agency/types";
import { StatusPill } from "./status-pill";
import { AgentAvatar } from "./agent-avatar";
import {
  formatCurrency,
  formatHours,
  formatRuntime,
  formatRuntimeClock,
  formatTokens,
} from "@/lib/agency/format";
import {
  bucketLabel,
  categoryColor,
  categoryLabel,
  difficultyBucket,
} from "@/lib/agency/scoring";
import type { DifficultyBucket } from "@/lib/agency/types";

const BUCKET_DOT_COLOR: Record<DifficultyBucket, string> = {
  trivial: "#94A3B8",
  normal: "#0EA5E9",
  moderate: "#F59E0B",
  hard: "#EF4444",
  very_hard: "#A78BFA",
};

type Props = {
  runs: Run[];
  clients: Client[];
  projects: Project[];
  skills: Skill[];
};

const STATUS_OPTIONS: Array<{ value: "all" | RunStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "running", label: "Running" },
  { value: "awaiting_approval", label: "Awaiting approval" },
  { value: "shipped", label: "Shipped" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

export function RunsTable({ runs, clients, projects, skills }: Props) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<"all" | RunStatus>("all");
  const [clientId, setClientId] = React.useState<string>("all");
  const [inboxOnly, setInboxOnly] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const lastIndexRef = React.useRef<number | null>(null);

  const clientById = React.useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  );
  const projectById = React.useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );
  const skillById = React.useMemo(
    () => new Map(skills.map((s) => [s.id, s])),
    [skills],
  );

  const inboxCount = React.useMemo(
    () => runs.filter((r) => r.unsorted).length,
    [runs],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return runs.filter((r) => {
      if (inboxOnly && !r.unsorted) return false;
      if (status !== "all" && r.status !== status) return false;
      if (clientId !== "all" && r.clientId !== clientId) return false;
      if (q) {
        const hay = `${r.id} ${r.prompt ?? ""} ${
          skillById.get(r.skillId)?.name ?? ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [runs, search, status, clientId, inboxOnly, skillById]);

  // Drop selected ids that are no longer in the filtered list (so the action
  // bar count stays honest).
  React.useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(filtered.map((r) => r.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (visible.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [filtered]);

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = (next: boolean) => {
    if (next) setSelected(new Set(filtered.map((r) => r.id)));
    else setSelected(new Set());
    lastIndexRef.current = null;
  };

  const toggleRow = (idx: number, runId: string, shift: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const start =
        shift && lastIndexRef.current !== null
          ? Math.min(lastIndexRef.current, idx)
          : idx;
      const end =
        shift && lastIndexRef.current !== null
          ? Math.max(lastIndexRef.current, idx)
          : idx;
      const targetState = !next.has(runId);
      for (let i = start; i <= end; i++) {
        const id = filtered[i]?.id;
        if (!id) continue;
        if (targetState) next.add(id);
        else next.delete(id);
      }
      return next;
    });
    lastIndexRef.current = idx;
  };

  const selectedRuns = React.useMemo(
    () => filtered.filter((r) => selected.has(r.id)),
    [filtered, selected],
  );

  return (
    <section
      className={cn(
        "rounded-[8px] bg-[var(--color-bg-surface)]",
        "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <div className="flex flex-col gap-[12px] p-[16px] sm:p-[20px]">
        {inboxCount > 0 ? (
          <button
            type="button"
            onClick={() => setInboxOnly((v) => !v)}
            className={cn(
              "flex w-full items-center justify-between gap-[12px] rounded-[8px] px-[14px] py-[10px]",
              "ring-1 transition-colors",
              inboxOnly
                ? "bg-[color-mix(in_oklab,var(--color-accent-orange)_18%,transparent)] ring-[var(--color-accent-orange)] text-[var(--color-text-strong)]"
                : "bg-[color-mix(in_oklab,var(--color-accent-orange)_8%,transparent)] ring-[var(--color-stroke-soft)] hover:ring-[var(--color-stroke-sub)]",
            )}
          >
            <span className="flex items-center gap-[10px]">
              <RiInboxLine
                size={16}
                className="text-[var(--color-accent-orange)]"
              />
              <span className="text-[13px] font-medium text-[var(--color-text-strong)]">
                {inboxCount} unsorted run{inboxCount === 1 ? "" : "s"} from the
                Stop hook
              </span>
            </span>
            <span className="text-[12px] text-[var(--color-text-soft)]">
              {inboxOnly ? "Showing only Inbox - click to clear" : "Click to triage"}
            </span>
          </button>
        ) : null}

        <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-[minmax(0,1fr)_minmax(0,200px)_minmax(0,200px)]">
          <div
            className={cn(
              "flex h-[44px] items-center gap-[8px] rounded-[8px] px-[14px]",
              "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
              "hover:ring-[var(--color-stroke-sub)]",
              "focus-within:ring-2 focus-within:ring-[var(--color-brand-400)]",
            )}
          >
            <RiSearchLine size={16} className="text-[var(--color-text-soft)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by run id, skill, or prompt"
              className="flex-1 bg-transparent text-[14px] text-[var(--color-text-strong)] outline-none placeholder:text-[var(--color-text-soft)]"
            />
          </div>

          <Select
            value={status}
            onValueChange={(v) => setStatus(v as "all" | RunStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="scrollbar-thin overflow-x-auto border-t border-[var(--color-stroke-soft)]">
        <table className="w-full min-w-[1200px] text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
              <th className="w-[44px] px-[16px] py-[12px]">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={toggleAll}
                  aria-label={
                    allSelected ? "Deselect all" : "Select all visible runs"
                  }
                  size={16}
                />
              </th>
              <Th>Run</Th>
              <Th>Client / Project</Th>
              <Th>Skill</Th>
              <Th>Status</Th>
              <Th>Scoring</Th>
              <Th align="right">Runtime</Th>
              <Th align="right">Effective</Th>
              <Th align="right">Tokens</Th>
              <Th align="right">Cost</Th>
              <Th align="right">Billable</Th>
              <Th align="right">Started</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => {
              const client = r.clientId ? clientById.get(r.clientId) : undefined;
              const project = r.projectId ? projectById.get(r.projectId) : undefined;
              const skill = skillById.get(r.skillId);
              const runtimeHours = r.runtimeSec / 3600;
              const multiplier =
                runtimeHours > 0 ? r.baselineHours / runtimeHours : 0;
              const isLive =
                r.status === "running" || r.status === "awaiting_approval";
              const isSelected = selected.has(r.id);
              return (
                <tr
                  key={r.id}
                  className={cn(
                    "border-t border-[var(--color-stroke-soft)] transition-colors",
                    isSelected
                      ? "bg-[color-mix(in_oklab,var(--color-brand-400)_8%,transparent)]"
                      : "hover:bg-[var(--color-bg-tint-2)]",
                  )}
                >
                  <td className="w-[44px] px-[16px] py-[14px] align-middle">
                    <span
                      onClick={(e) => {
                        // capture shiftKey before the synthetic event recycles
                        toggleRow(idx, r.id, e.shiftKey);
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {
                          /* handled by parent click */
                        }}
                        aria-label={`Select run ${r.id}`}
                        size={16}
                      />
                    </span>
                  </td>
                  <Td>
                    <Link
                      href={`/agency/runs/${r.id}`}
                      className="flex items-start gap-[10px]"
                    >
                      <AgentAvatar name={r.agentName} size={32} />
                      <div className="flex min-w-0 flex-col">
                        <span className="font-mono text-[12px] text-[var(--color-text-strong)]">
                          {r.id}
                        </span>
                        <span className="line-clamp-1 max-w-[260px] text-[12px] text-[var(--color-text-soft)]">
                          {r.prompt ?? skill?.description ?? "-"}
                        </span>
                      </div>
                    </Link>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-[8px]">
                      {project ? (
                        <span
                          className="size-[10px] shrink-0 rounded-[3px]"
                          style={{ backgroundColor: project.color }}
                        />
                      ) : null}
                      <div className="flex flex-col">
                        <span className="text-[var(--color-text-strong)]">
                          {client?.name ?? "-"}
                        </span>
                        <span className="text-[12px] text-[var(--color-text-soft)]">
                          {project?.name ?? "-"}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-[var(--color-text-strong)]">
                      {skill?.name ?? "-"}
                    </span>
                  </Td>
                  <Td>
                    <StatusPill status={r.status} />
                  </Td>
                  <Td>
                    <ScoringCell run={r} />
                  </Td>
                  <Td align="right">
                    <div className="flex flex-col items-end">
                      <span className="tabular-nums text-[var(--color-text-strong)]">
                        {isLive
                          ? formatRuntimeClock(r.runtimeSec)
                          : formatRuntime(r.runtimeSec)}
                      </span>
                      <span className="text-[11px] tabular-nums text-[var(--color-text-soft)]">
                        active {formatRuntime(r.activeSec)}
                      </span>
                    </div>
                  </Td>
                  <Td align="right">
                    <div className="flex flex-col items-end">
                      <span className="tabular-nums text-[var(--color-text-strong)]">
                        {formatHours(r.baselineHours, 0)}
                      </span>
                      <span className="text-[11px] tabular-nums text-[var(--color-text-soft)]">
                        {runtimeHours > 0
                          ? `${runtimeHours.toFixed(2)}h runtime`
                          : "-"}{" "}
                        {multiplier > 0 ? (
                          <span className="text-emerald-300">
                            ({multiplier.toFixed(1)}×)
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </Td>
                  <Td align="right">
                    <div className="flex flex-col items-end">
                      <span className="tabular-nums text-[var(--color-text-sub)]">
                        {formatTokens(r.tokensIn)} in
                      </span>
                      <span className="text-[11px] tabular-nums text-[var(--color-text-soft)]">
                        {formatTokens(r.tokensOut)} out
                      </span>
                    </div>
                  </Td>
                  <Td align="right" className="tabular-nums text-[var(--color-text-sub)]">
                    {formatCurrency(r.costUsd, 2)}
                  </Td>
                  <Td
                    align="right"
                    className="font-semibold tabular-nums text-[var(--color-text-strong)]"
                  >
                    {r.billableUsd > 0 ? formatCurrency(r.billableUsd, 0) : "-"}
                  </Td>
                  <Td
                    align="right"
                    className="text-[var(--color-text-soft)]"
                    suppressHydrationWarning
                  >
                    {formatDistanceToNowStrict(new Date(r.startedAt), {
                      addSuffix: true,
                    })}
                  </Td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-[16px] py-[40px] text-center">
                  <div className="text-[14px] font-semibold text-[var(--color-text-strong)]">
                    {runs.length === 0
                      ? "No runs yet"
                      : "Nothing matches those filters"}
                  </div>
                  <div className="mt-[4px] text-[13px] text-[var(--color-text-soft)]">
                    {runs.length === 0
                      ? "Start one from your AI agent session - runs land here as they begin."
                      : "Try clearing search or widening the status filter."}
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selectedRuns.length > 0 ? (
        <BulkAssignBar
          selectedRuns={selectedRuns}
          clients={clients}
          projects={projects}
          onClear={() => {
            setSelected(new Set());
            lastIndexRef.current = null;
          }}
          onAssigned={() => {
            setSelected(new Set());
            lastIndexRef.current = null;
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}

function BulkAssignBar({
  selectedRuns,
  clients,
  projects,
  onClear,
  onAssigned,
}: {
  selectedRuns: Run[];
  clients: Client[];
  projects: Project[];
  onClear: () => void;
  onAssigned: () => void;
}) {
  const [target, setTarget] = React.useState<string>("");
  const [alsoMapCwd, setAlsoMapCwd] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Group projects by client for the dropdown.
  const grouped = React.useMemo(() => {
    const byClient = new Map<string, Project[]>();
    for (const p of projects) {
      const arr = byClient.get(p.clientId) ?? [];
      arr.push(p);
      byClient.set(p.clientId, arr);
    }
    return clients
      .map((c) => ({ client: c, items: byClient.get(c.id) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [clients, projects]);

  // If every selected run shares one cwd, surface the cwd-pin offer.
  const sharedCwd = React.useMemo(() => {
    const set = new Set(selectedRuns.map((r) => r.cwd ?? "").filter(Boolean));
    return set.size === 1 ? Array.from(set)[0] : null;
  }, [selectedRuns]);

  async function onSubmit() {
    if (!target) return;
    const [clientId, projectId] = target.split(":");
    if (!clientId || !projectId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/agency/runs/bulk-assign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          runIds: selectedRuns.map((r) => r.id),
          clientId,
          projectId,
          alsoMapCwd: alsoMapCwd && sharedCwd !== null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      onAssigned();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sticky bottom-[16px] z-10 mx-[16px] mb-[16px] sm:mx-[20px] sm:mb-[20px]">
      <div
        className={cn(
          "flex flex-wrap items-center gap-[12px] rounded-[10px] px-[16px] py-[12px]",
          "bg-[var(--color-bg-surface-elevated)]/95 ring-1 ring-[var(--color-stroke-sub)]",
          "shadow-[var(--shadow-regular-md)] backdrop-blur-xl",
          "supports-[backdrop-filter]:bg-[var(--color-bg-surface-elevated)]/82",
        )}
      >
        <span className="text-[13px] font-medium text-[var(--color-text-strong)]">
          {selectedRuns.length} run{selectedRuns.length === 1 ? "" : "s"} selected
        </span>

        <div className="min-w-[260px] flex-1">
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger>
              <SelectValue placeholder="Move to project..." />
            </SelectTrigger>
            <SelectContent>
              {grouped.length === 0 ? (
                <div className="px-[8px] py-[6px] text-[12px] text-[var(--color-text-soft)]">
                  Create a project first.
                </div>
              ) : (
                grouped.map((g) => (
                  <React.Fragment key={g.client.id}>
                    <div className="px-[8px] pt-[6px] text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
                      {g.client.name}
                    </div>
                    {g.items.map((p) => (
                      <SelectItem
                        key={p.id}
                        value={`${g.client.id}:${p.id}`}
                      >
                        {p.name}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {sharedCwd ? (
          <label className="flex items-center gap-[6px] text-[12px] text-[var(--color-text-soft)]">
            <Checkbox
              checked={alsoMapCwd}
              onCheckedChange={setAlsoMapCwd}
              size={16}
            />
            <span>
              Always log{" "}
              <span className="font-mono text-[var(--color-text-sub)]">
                {sharedCwd.length > 36
                  ? "..." + sharedCwd.slice(-36)
                  : sharedCwd}
              </span>{" "}
              here
            </span>
          </label>
        ) : null}

        {error ? (
          <span className="text-[12px] text-rose-300">{error}</span>
        ) : null}

        <div className="ml-auto flex items-center gap-[8px]">
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
          <Button
            type="button"
            variant="primary-orange"
            size="sm"
            disabled={!target || submitting}
            onClick={onSubmit}
          >
            {submitting ? "Moving..." : "Move"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-[16px] py-[12px] font-semibold",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}

function ScoringCell({ run }: { run: Run }) {
  const cat = run.changeCategory ?? null;
  const bucket = difficultyBucket(run.difficultyScore);
  const color = categoryColor(cat);
  const lowQuality = run.qualityConfidence < 1.0;

  return (
    <div className="flex flex-col gap-[4px]">
      <div className="flex items-center gap-[4px]">
        {cat ? (
          <span
            className="inline-flex items-center rounded-[4px] px-[6px] py-[2px] text-[11px] font-semibold leading-[14px]"
            style={{
              backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`,
              color,
            }}
          >
            {categoryLabel(cat)}
          </span>
        ) : (
          <span className="text-[11px] text-[var(--color-text-soft)]">--</span>
        )}
        {lowQuality ? (
          <span
            title={`Quality ${run.qualityConfidence.toFixed(2)}`}
            aria-label={`Quality confidence ${run.qualityConfidence.toFixed(2)}`}
            className="text-[11px] font-semibold leading-[14px] text-[var(--color-accent-orange)]"
          >
            *
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-[5px]">
        <span
          aria-hidden
          className="h-[6px] w-[6px] shrink-0 rounded-full"
          style={{
            backgroundColor: bucket
              ? BUCKET_DOT_COLOR[bucket]
              : "var(--color-bg-tint-14)",
          }}
        />
        <span className="text-[11px] leading-[14px] text-[var(--color-text-soft)]">
          {bucketLabel(bucket)}
        </span>
      </div>
    </div>
  );
}

function Td({
  children,
  className,
  align = "left",
  suppressHydrationWarning,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
  suppressHydrationWarning?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-[16px] py-[14px] text-[var(--color-text-sub)]",
        align === "right" && "text-right",
        className,
      )}
      suppressHydrationWarning={suppressHydrationWarning}
    >
      {children}
    </td>
  );
}
