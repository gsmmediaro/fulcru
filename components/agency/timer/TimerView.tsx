"use client";

import * as React from "react";
import {
  RiTimeLine,
  RiExternalLinkLine,
} from "@remixicon/react";
import { cn } from "@/lib/cn";
import type { Client, Project, Run } from "@/lib/agency/types";
import { groupByDay, weekTotalSec, formatClock } from "./lib";
import { EntryBar } from "./EntryBar";
import { DayGroup } from "./DayGroup";
import { ConnectMcpButton } from "@/components/agency/connect-mcp-modal";

type Props = {
  initialRuns: Run[];
  clients: Client[];
  projects: Project[];
  currency?: string;
};

export function TimerView({ initialRuns, clients, projects, currency }: Props) {
  const [runs, setRuns] = React.useState<Run[]>(initialRuns);

  // Identify the current active (running) run (manual or break only)
  const activeRun = runs.find(
    (r) => r.status === "running" && (r.kind === "manual" || r.kind === "break"),
  ) ?? null;

  // Group remaining runs by day
  const dayGroups = React.useMemo(() => groupByDay(runs), [runs]);

  // Week total – reticks every second if any run is running
  const hasRunning = runs.some((r) => r.status === "running");
  const [, setWeekTick] = React.useState(0);
  React.useEffect(() => {
    if (!hasRunning) return;
    const id = setInterval(() => setWeekTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [hasRunning]);

  const weekTotal = weekTotalSec(runs);

  function handleRunStarted(run: Run) {
    setRuns((prev) => [run, ...prev.filter((r) => r.id !== run.id)]);
  }

  function handleRunStopped(run: Run) {
    setRuns((prev) => prev.map((r) => (r.id === run.id ? run : r)));
  }

  function handleEntryAdded(run: Run) {
    setRuns((prev) => [run, ...prev]);
  }

  function handleDelete(run: Run) {
    setRuns((prev) => prev.filter((r) => r.id !== run.id));
  }

  function handleUpdate(runId: string, patch: { description?: string; billable?: boolean }) {
    setRuns((prev) =>
      prev.map((r) => {
        if (r.id !== runId) return r;
        return {
          ...r,
          prompt: patch.description !== undefined ? patch.description : r.prompt,
          billableUsd:
            patch.billable !== undefined
              ? patch.billable
                ? r.rateUsd * (r.runtimeSec / 3600)
                : 0
              : r.billableUsd,
        };
      }),
    );
  }

  async function handleReplay(run: Run) {
    try {
      const res = await fetch("/api/agency/runs/start-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: run.prompt,
          clientId: run.clientId || undefined,
          projectId: run.projectId || undefined,
          skillId: run.skillId || undefined,
          billable: run.billableUsd > 0,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const newRun = (await res.json()) as Run;
      handleRunStarted(newRun);
    } catch (e) {
      console.error("Failed to replay run:", e);
    }
  }

  const isEmpty = runs.length === 0;

  return (
    <div className="space-y-[20px]">
      {/* Entry bar */}
      <EntryBar
        clients={clients}
        projects={projects}
        activeRun={activeRun}
        onRunStarted={handleRunStarted}
        onRunStopped={handleRunStopped}
        onEntryAdded={handleEntryAdded}
      />

      {/* Week header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[8px]">
          <RiTimeLine size={15} className="text-[var(--color-text-soft)]" />
          <span className="text-[14px] font-semibold text-[var(--color-text-strong)]">
            This week
          </span>
        </div>
        <div className="flex items-center gap-[16px]">
          <button className="flex items-center gap-[4px] text-[13px] text-[var(--color-brand-400)] hover:underline">
            <RiExternalLinkLine size={13} />
            Submit for approval
          </button>
          <span className="text-[13px] text-[var(--color-text-soft)]">
            Week total:{" "}
            <span className="font-mono font-semibold tabular-nums text-[var(--color-text-strong)]">
              {formatClock(weekTotal)}
            </span>
          </span>
        </div>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div
          className={cn(
            "rounded-[10px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
            "flex flex-col items-center justify-center gap-[16px] py-[64px] text-center",
          )}
        >
          <RiTimeLine size={40} className="text-[var(--color-text-soft)] opacity-40" />
          <div>
            <p className="text-[15px] font-semibold text-[var(--color-text-strong)]">
              No tracked time yet
            </p>
            <p className="mt-[4px] text-[13px] text-[var(--color-text-soft)]">
              Start a timer above, or connect an AI agent to track runs automatically.
            </p>
          </div>
          <div className="flex items-center gap-[10px]">
            <button
              onClick={() => {
                // Focus the description input in the entry bar
                document
                  .querySelector<HTMLInputElement>("input[placeholder='What are you working on?']")
                  ?.focus();
              }}
              className="rounded-[6px] bg-[var(--color-brand-400)] px-[14px] py-[8px] text-[13px] font-semibold text-[#0b1f21] hover:bg-[var(--color-brand-500)] transition-colors"
            >
              Start a timer
            </button>
            <ConnectMcpButton variant="outline" size="sm">
              Connect agent
            </ConnectMcpButton>
          </div>
        </div>
      )}

      {/* Day groups */}
      {dayGroups.map((group) => (
        <DayGroup
          key={group.dateKey}
          group={group}
          clients={clients}
          projects={projects}
          currency={currency}
          activeRunId={activeRun?.id}
          onReplay={handleReplay}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      ))}

      {/* ConnectMcpButton is used inline in the empty state above */}
    </div>
  );
}
