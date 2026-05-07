"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import type { Client, Project, Run } from "@/lib/agency/types";
import type { DayGroup as DayGroupType } from "./lib";
import { formatClock, elapsedSec } from "./lib";
import { RunRow } from "./RunRow";

type Props = {
  group: DayGroupType;
  clients: Client[];
  projects: Project[];
  activeRunId?: string | null; // ID of current live run (for clock)
  onReplay?: (run: Run) => void;
  onDelete?: (run: Run) => void;
  onUpdate?: (runId: string, patch: { description?: string; billable?: boolean }) => void;
};

export function DayGroup({
  group,
  clients,
  projects,
  activeRunId,
  onReplay,
  onDelete,
  onUpdate,
}: Props) {
  // Live tick for the day total if any run in group is running
  const hasRunningRun = group.runs.some(
    (r) => r.status === "running" && r.kind !== "break",
  );

  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!hasRunningRun) return;
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [hasRunningRun]);

  // Recompute day total with live elapsed
  const dayTotalSec = group.runs
    .filter((r) => r.kind !== "break")
    .reduce((s, r) => {
      if (r.status === "running") {
        return s + elapsedSec(r.startedAt);
      }
      return s + r.runtimeSec;
    }, 0);

  return (
    <div className={cn("rounded-[8px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]")}>
      {/* Day header */}
      <div className="flex items-center justify-between px-[16px] py-[10px]">
        <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
          {group.label}
        </span>
        <span className="font-mono text-[13px] tabular-nums text-[var(--color-text-soft)]">
          {formatClock(dayTotalSec)}
        </span>
      </div>

      {/* Run rows */}
      {group.runs.map((run) => {
        const liveElapsed =
          run.status === "running" ? elapsedSec(run.startedAt) : undefined;
        return (
          <RunRow
            key={run.id}
            run={run}
            clients={clients}
            projects={projects}
            liveElapsed={liveElapsed}
            onReplay={onReplay}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        );
      })}
    </div>
  );
}
