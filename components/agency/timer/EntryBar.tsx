"use client";

import * as React from "react";
import {
  RiPlayLine,
  RiStopLine,
  RiAddLine,
  RiRestTimeLine,
  RiPriceTag3Line,
  RiTimeLine,
  RiCalendarLine,
  RiMoreLine,
} from "@remixicon/react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import type { Client, Project, Run } from "@/lib/agency/types";
import { formatClock, todayInputValue } from "./lib";

type Mode = "timer" | "manual" | "break";

type Props = {
  clients: Client[];
  projects: Project[];
  activeRun: Run | null; // a currently running (status='running', kind in manual/break) run
  onRunStarted: (run: Run) => void;
  onRunStopped: (run: Run) => void;
  onEntryAdded: (run: Run) => void;
};

export function EntryBar({
  clients,
  projects,
  activeRun,
  onRunStarted,
  onRunStopped,
  onEntryAdded,
}: Props) {
  const [mode, setMode] = React.useState<Mode>(
    activeRun ? (activeRun.kind === "break" ? "break" : "timer") : "timer",
  );

  // Timer state
  const [description, setDescription] = React.useState(
    activeRun?.kind === "manual" ? (activeRun.prompt ?? "") : "",
  );
  const [clientId, setClientId] = React.useState(
    activeRun?.clientId ?? "",
  );
  const [projectId, setProjectId] = React.useState(
    activeRun?.projectId ?? "",
  );
  const [billable, setBillable] = React.useState(
    activeRun ? activeRun.billableUsd > 0 : false,
  );

  // Manual mode
  const [manualDesc, setManualDesc] = React.useState("");
  const [manualClientId, setManualClientId] = React.useState("");
  const [manualProjectId, setManualProjectId] = React.useState("");
  const [manualBillable, setManualBillable] = React.useState(false);
  const [manualDate, setManualDate] = React.useState(todayInputValue());
  const [manualStart, setManualStart] = React.useState("09:00");
  const [manualEnd, setManualEnd] = React.useState("10:00");

  // Break state
  const [breakProjectId, setBreakProjectId] = React.useState("");

  // Live clock
  const [elapsed, setElapsed] = React.useState<number>(
    activeRun && activeRun.status === "running"
      ? Math.round((Date.now() - new Date(activeRun.startedAt).getTime()) / 1000)
      : 0,
  );
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [tagsOpen, setTagsOpen] = React.useState(false);
  const descRef = React.useRef<HTMLInputElement>(null);

  // Keep elapsed ticking when there's an active run
  React.useEffect(() => {
    if (activeRun && activeRun.status === "running") {
      const start = new Date(activeRun.startedAt).getTime();
      timerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - start) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeRun]);

  // Derive filtered projects by client
  const filteredProjects = React.useMemo(
    () =>
      clientId
        ? projects.filter((p) => p.clientId === clientId)
        : projects,
    [projects, clientId],
  );

  const manualFilteredProjects = React.useMemo(
    () =>
      manualClientId
        ? projects.filter((p) => p.clientId === manualClientId)
        : projects,
    [projects, manualClientId],
  );

  // Compute manual duration display
  const manualDurationSec = React.useMemo(() => {
    try {
      const s = new Date(`${manualDate}T${manualStart}:00`).getTime();
      let e = new Date(`${manualDate}T${manualEnd}:00`).getTime();
      if (e <= s) e += 86400000;
      return Math.max(0, Math.round((e - s) / 1000));
    } catch {
      return 0;
    }
  }, [manualDate, manualStart, manualEnd]);

  async function handleStart() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        description: description.trim() || undefined,
        clientId: clientId || undefined,
        projectId: projectId || undefined,
        billable,
      };
      const res = await fetch("/api/agency/runs/start-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const run = (await res.json()) as Run;
      onRunStarted(run);
    } catch (e) {
      console.error("Failed to start timer:", e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStop() {
    if (!activeRun || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/agency/runs/${activeRun.id}/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      const run = (await res.json()) as Run;
      onRunStopped(run);
      setDescription("");
      setClientId("");
      setProjectId("");
      setBillable(false);
    } catch (e) {
      console.error("Failed to stop timer:", e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdd() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const body = {
        date: manualDate,
        startTime: manualStart,
        endTime: manualEnd,
        description: manualDesc.trim() || undefined,
        clientId: manualClientId || undefined,
        projectId: manualProjectId || undefined,
        billable: manualBillable,
      };
      const res = await fetch("/api/agency/runs/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const run = (await res.json()) as Run;
      onEntryAdded(run);
      setManualDesc("");
      setManualStart("09:00");
      setManualEnd("10:00");
      setManualDate(todayInputValue());
    } catch (e) {
      console.error("Failed to add entry:", e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartBreak() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/agency/runs/start-break", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: breakProjectId || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      const run = (await res.json()) as Run;
      onRunStarted(run);
    } catch (e) {
      console.error("Failed to start break:", e);
    } finally {
      setSubmitting(false);
    }
  }

  const isRunning = !!activeRun && activeRun.status === "running";
  const isBreakRunning = isRunning && activeRun?.kind === "break";
  const isTimerRunning = isRunning && activeRun?.kind !== "break";

  return (
    <div
      className={cn(
        "rounded-[10px] bg-[var(--color-bg-surface)]",
        "ring-1 ring-[var(--color-stroke-soft)]",
        "transition-all duration-200",
        isRunning && "ring-[var(--color-brand-400)]",
      )}
    >
      {/* Mode toggle */}
      {!isRunning && (
        <div className="flex items-center gap-[2px] border-b border-[var(--color-stroke-soft)] px-[16px] pt-[14px] pb-[0px]">
          {(["timer", "manual", "break"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-t-[6px] px-[14px] py-[8px] text-[13px] font-semibold transition-colors",
                mode === m
                  ? "bg-[var(--color-brand-400)] text-[#0b1f21]"
                  : "text-[var(--color-text-soft)] hover:text-[var(--color-text-strong)]",
              )}
            >
              {m === "timer" ? "Timer" : m === "manual" ? "Manual" : "Break"}
            </button>
          ))}
        </div>
      )}

      {/* Timer mode */}
      {(mode === "timer" || isTimerRunning) && (
        <div className="flex flex-wrap items-center gap-[8px] p-[12px] sm:flex-nowrap">
          <input
            ref={descRef}
            type="text"
            value={isTimerRunning ? (activeRun?.prompt ?? description) : description}
            onChange={(e) => setDescription(e.target.value)}
            readOnly={isTimerRunning}
            placeholder="What are you working on?"
            className={cn(
              "min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[var(--color-text-strong)]",
              "placeholder:text-[var(--color-text-soft)] outline-none",
              isTimerRunning && "opacity-70",
            )}
          />

          {/* Project picker */}
          <div className="w-[160px] shrink-0">
            <Select
              value={
                (isTimerRunning ? activeRun?.projectId : projectId) || "__none"
              }
              onValueChange={(v) => {
                if (isTimerRunning) return;
                const next = v === "__none" ? "" : v;
                setProjectId(next);
                // auto-set client from project
                const proj = projects.find((p) => p.id === next);
                if (proj) setClientId(proj.clientId);
              }}
              disabled={isTimerRunning}
            >
              <SelectTrigger className="h-[36px] text-[13px]">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No project</SelectItem>
                {filteredProjects.map((p) => {
                  const client = clients.find((c) => c.id === p.clientId);
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-[6px]">
                        <span
                          className="size-[8px] shrink-0 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                        {client ? (
                          <span className="text-[var(--color-text-soft)]">
                            {" · " + client.name}
                          </span>
                        ) : null}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Tags placeholder */}
          <div className="relative">
            <button
              onClick={() => setTagsOpen((v) => !v)}
              className={cn(
                "flex size-[36px] items-center justify-center rounded-[6px] transition-colors",
                "text-[var(--color-text-soft)] hover:bg-[color-mix(in_oklab,white_6%,transparent)] hover:text-[var(--color-text-strong)]",
              )}
              title="Tags"
            >
              <RiPriceTag3Line size={16} />
            </button>
            {tagsOpen && (
              <div
                className={cn(
                  "absolute left-0 top-full z-50 mt-[6px] min-w-[180px]",
                  "rounded-[8px] bg-[var(--color-bg-surface-elevated)] p-[12px]",
                  "ring-1 ring-[var(--color-stroke-sub)] shadow-[var(--shadow-regular-lg)]",
                  "text-[13px] text-[var(--color-text-soft)]",
                )}
              >
                Tags coming soon
              </div>
            )}
          </div>

          {/* Billable toggle */}
          <button
            onClick={() => !isTimerRunning && setBillable((v) => !v)}
            disabled={isTimerRunning}
            className={cn(
              "flex h-[36px] items-center gap-[4px] rounded-[6px] px-[10px] text-[13px] font-semibold transition-colors",
              billable || (isTimerRunning && (activeRun?.billableUsd ?? 0) > 0)
                ? "bg-[color-mix(in_oklab,var(--color-brand-400)_15%,transparent)] text-[var(--color-brand-400)]"
                : "text-[var(--color-text-soft)] hover:bg-[color-mix(in_oklab,white_6%,transparent)] hover:text-[var(--color-text-strong)]",
            )}
          >
            $
          </button>

          {/* Clock display */}
          <span className="w-[88px] text-center font-mono text-[17px] font-semibold tabular-nums text-[var(--color-text-strong)]">
            {formatClock(isTimerRunning ? elapsed : 0)}
          </span>

          {/* Start / Stop */}
          {isTimerRunning ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleStop}
              disabled={submitting}
              className="shrink-0 bg-red-500 hover:bg-red-600"
              leadingIcon={<RiStopLine size={15} />}
            >
              STOP
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleStart}
              disabled={submitting}
              className="shrink-0"
              leadingIcon={<RiPlayLine size={15} />}
            >
              START
            </Button>
          )}

          {/* Overflow */}
          <Dropdown>
            <DropdownTrigger asChild>
              <button className="flex size-[36px] items-center justify-center rounded-[6px] text-[var(--color-text-soft)] hover:bg-[color-mix(in_oklab,white_6%,transparent)] hover:text-[var(--color-text-strong)] transition-colors">
                <RiMoreLine size={18} />
              </button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem onClick={() => setMode("manual")}>
                Switch to manual
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      )}

      {/* Manual mode */}
      {mode === "manual" && !isRunning && (
        <div className="space-y-[8px] p-[12px]">
          <div className="flex flex-wrap items-center gap-[8px] sm:flex-nowrap">
            <input
              type="text"
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              placeholder="What have you worked on?"
              className={cn(
                "min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[var(--color-text-strong)]",
                "placeholder:text-[var(--color-text-soft)] outline-none",
              )}
            />

            {/* Project picker */}
            <div className="w-[160px] shrink-0">
              <Select
                value={manualProjectId || "__none"}
                onValueChange={(v) => {
                  const next = v === "__none" ? "" : v;
                  setManualProjectId(next);
                  const proj = projects.find((p) => p.id === next);
                  if (proj) setManualClientId(proj.clientId);
                }}
              >
                <SelectTrigger className="h-[36px] text-[13px]">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No project</SelectItem>
                  {manualFilteredProjects.map((p) => {
                    const client = clients.find((c) => c.id === p.clientId);
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-[6px]">
                          <span
                            className="size-[8px] shrink-0 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.name}
                          {client ? (
                            <span className="text-[var(--color-text-soft)]">
                              {" · " + client.name}
                            </span>
                          ) : null}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Tags placeholder */}
            <button
              onClick={() => setTagsOpen((v) => !v)}
              className="flex size-[36px] items-center justify-center rounded-[6px] text-[var(--color-text-soft)] hover:bg-[color-mix(in_oklab,white_6%,transparent)] hover:text-[var(--color-text-strong)] transition-colors"
            >
              <RiPriceTag3Line size={16} />
            </button>

            {/* Billable */}
            <button
              onClick={() => setManualBillable((v) => !v)}
              className={cn(
                "flex h-[36px] items-center gap-[4px] rounded-[6px] px-[10px] text-[13px] font-semibold transition-colors",
                manualBillable
                  ? "bg-[color-mix(in_oklab,var(--color-brand-400)_15%,transparent)] text-[var(--color-brand-400)]"
                  : "text-[var(--color-text-soft)] hover:bg-[color-mix(in_oklab,white_6%,transparent)] hover:text-[var(--color-text-strong)]",
              )}
            >
              $
            </button>
          </div>

          {/* Time range row */}
          <div className="flex flex-wrap items-center gap-[8px]">
            {/* Start time */}
            <div className="flex items-center gap-[6px] rounded-[6px] ring-1 ring-[var(--color-stroke-soft)] px-[10px] h-[36px] bg-[color-mix(in_oklab,white_3%,transparent)]">
              <RiTimeLine size={14} className="text-[var(--color-text-soft)]" />
              <input
                type="time"
                value={manualStart}
                onChange={(e) => setManualStart(e.target.value)}
                className="bg-transparent text-[13px] text-[var(--color-text-strong)] outline-none [color-scheme:dark]"
              />
            </div>
            <span className="text-[var(--color-text-soft)]">–</span>
            {/* End time */}
            <div className="flex items-center gap-[6px] rounded-[6px] ring-1 ring-[var(--color-stroke-soft)] px-[10px] h-[36px] bg-[color-mix(in_oklab,white_3%,transparent)]">
              <input
                type="time"
                value={manualEnd}
                onChange={(e) => setManualEnd(e.target.value)}
                className="bg-transparent text-[13px] text-[var(--color-text-strong)] outline-none [color-scheme:dark]"
              />
            </div>

            {/* Date picker */}
            <div className="flex items-center gap-[6px] rounded-[6px] ring-1 ring-[var(--color-stroke-soft)] px-[10px] h-[36px] bg-[color-mix(in_oklab,white_3%,transparent)]">
              <RiCalendarLine size={14} className="text-[var(--color-text-soft)]" />
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="bg-transparent text-[13px] text-[var(--color-text-strong)] outline-none [color-scheme:dark]"
              />
            </div>

            {/* Duration display */}
            <span className="font-mono text-[14px] tabular-nums text-[var(--color-text-sub)]">
              {formatClock(manualDurationSec)}
            </span>

            <div className="ml-auto">
              <Button
                variant="primary"
                size="md"
                onClick={handleAdd}
                disabled={submitting}
                leadingIcon={<RiAddLine size={15} />}
              >
                ADD
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Break mode */}
      {(mode === "break" || isBreakRunning) && (
        <div className="flex flex-wrap items-center gap-[8px] p-[12px] sm:flex-nowrap">
          <RiRestTimeLine size={20} className="shrink-0 text-[var(--color-text-soft)]" />
          <span className="flex-1 text-[15px] font-medium text-[var(--color-text-soft)]">
            {isBreakRunning ? "Break" : "Break"}
          </span>

          {!isBreakRunning && (
            <div className="w-[160px] shrink-0">
              <Select
                value={breakProjectId || "__none"}
                onValueChange={(v) =>
                  setBreakProjectId(v === "__none" ? "" : v)
                }
              >
                <SelectTrigger className="h-[36px] text-[13px]">
                  <SelectValue placeholder="Project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Clock */}
          <span className="w-[88px] text-center font-mono text-[17px] font-semibold tabular-nums text-amber-400">
            {formatClock(isBreakRunning ? elapsed : 0)}
          </span>

          {isBreakRunning ? (
            <Button
              size="md"
              onClick={handleStop}
              disabled={submitting}
              className="shrink-0 bg-amber-500 text-white hover:bg-amber-600"
              leadingIcon={<RiStopLine size={15} />}
            >
              END BREAK
            </Button>
          ) : (
            <Button
              size="md"
              onClick={handleStartBreak}
              disabled={submitting}
              className="shrink-0 bg-amber-500 text-white hover:bg-amber-600"
              leadingIcon={<RiRestTimeLine size={15} />}
            >
              START BREAK
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
