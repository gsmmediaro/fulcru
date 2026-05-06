"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { RiSearchLine } from "@remixicon/react";
import { cn } from "@/lib/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<"all" | RunStatus>("all");
  const [clientId, setClientId] = React.useState<string>("all");

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

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return runs.filter((r) => {
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
  }, [runs, search, status, clientId, skillById]);

  return (
    <section
      className={cn(
        "rounded-[12px] bg-[var(--color-bg-surface)]",
        "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <div className="grid grid-cols-1 gap-[12px] p-[16px] sm:grid-cols-[minmax(0,1fr)_minmax(0,200px)_minmax(0,200px)] sm:p-[20px]">
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

      <div className="scrollbar-thin overflow-x-auto border-t border-[var(--color-stroke-soft)]">
        <table className="w-full min-w-[1080px] text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
              <Th>Run</Th>
              <Th>Client / Project</Th>
              <Th>Skill</Th>
              <Th>Status</Th>
              <Th align="right">Runtime</Th>
              <Th align="right">Effective</Th>
              <Th align="right">Tokens</Th>
              <Th align="right">Cost</Th>
              <Th align="right">Billable</Th>
              <Th align="right">Started</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const client = clientById.get(r.clientId);
              const project = projectById.get(r.projectId);
              const skill = skillById.get(r.skillId);
              const runtimeHours = r.runtimeSec / 3600;
              const multiplier =
                runtimeHours > 0 ? r.baselineHours / runtimeHours : 0;
              const isLive =
                r.status === "running" || r.status === "awaiting_approval";
              return (
                <tr
                  key={r.id}
                  className={cn(
                    "border-t border-[var(--color-stroke-soft)] transition-colors",
                    "hover:bg-[color-mix(in_oklab,white_2%,transparent)]",
                  )}
                >
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
                          {r.prompt ?? skill?.description ?? "—"}
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
                          {client?.name ?? "—"}
                        </span>
                        <span className="text-[12px] text-[var(--color-text-soft)]">
                          {project?.name ?? "—"}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-[var(--color-text-strong)]">
                      {skill?.name ?? "—"}
                    </span>
                  </Td>
                  <Td>
                    <StatusPill status={r.status} />
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
                          : "—"}{" "}
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
                    {r.billableUsd > 0 ? formatCurrency(r.billableUsd, 0) : "—"}
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
                <td colSpan={10} className="px-[16px] py-[40px] text-center">
                  <div className="text-[14px] font-semibold text-[var(--color-text-strong)]">
                    {runs.length === 0
                      ? "No runs yet"
                      : "Nothing matches those filters"}
                  </div>
                  <div className="mt-[4px] text-[13px] text-[var(--color-text-soft)]">
                    {runs.length === 0
                      ? "Start one from your Claude Code session — runs land here as they begin."
                      : "Try clearing search or widening the status filter."}
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
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
