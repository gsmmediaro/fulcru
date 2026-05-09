"use client";

import * as React from "react";
import Link from "next/link";
import {
  RiPlayLine,
  RiMoreLine,
  RiPencilLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiExternalLinkLine,
  RiCalendarLine,
  RiPriceTag3Line,
} from "@remixicon/react";
import { cn } from "@/lib/cn";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import type { Client, Project, Run } from "@/lib/agency/types";
import { formatClock, formatTime, elapsedSec } from "./lib";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatCurrency } from "@/lib/agency/format";

type Props = {
  run: Run;
  clients: Client[];
  projects: Project[];
  currency?: string;
  liveElapsed?: number; // only provided when run.status === "running"
  onReplay?: (run: Run) => void;
  onDelete?: (run: Run) => void;
  onUpdate?: (runId: string, patch: { description?: string; billable?: boolean }) => void;
};

export function RunRow({
  run,
  clients,
  projects,
  currency = "USD",
  liveElapsed,
  onReplay,
  onDelete,
  onUpdate,
}: Props) {
  const [editing, setEditing] = React.useState(false);
  const [editDesc, setEditDesc] = React.useState(run.prompt ?? "");
  const [savingDesc, setSavingDesc] = React.useState(false);
  const [tagsOpen, setTagsOpen] = React.useState(false);
  const confirm = useConfirm();

  const project = projects.find((p) => p.id === run.projectId);
  const client = clients.find((c) => c.id === run.clientId);
  const isMcp = run.kind === "mcp";
  const isBreak = run.kind === "break";
  const isRunning = run.status === "running";
  const agentLabel = formatAgentLabel(run.agentName);

  const displaySec = isRunning
    ? (liveElapsed ?? elapsedSec(run.startedAt))
    : run.runtimeSec;

  const billable = run.billableUsd > 0;

  async function saveDesc() {
    if (savingDesc || isMcp) return;
    setSavingDesc(true);
    try {
      const res = await fetch(`/api/agency/runs/${run.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editDesc.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      onUpdate?.(run.id, { description: editDesc.trim() });
    } catch (e) {
      console.error("Failed to update description:", e);
    } finally {
      setSavingDesc(false);
      setEditing(false);
    }
  }

  async function toggleBillable() {
    if (isMcp || isBreak) return;
    const newBillable = !billable;
    try {
      const res = await fetch(`/api/agency/runs/${run.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billable: newBillable }),
      });
      if (!res.ok) throw new Error(await res.text());
      onUpdate?.(run.id, { billable: newBillable });
    } catch (e) {
      console.error("Failed to toggle billable:", e);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: isMcp ? "Delete this MCP run?" : "Delete this time entry?",
      description: run.prompt
        ? `"${run.prompt.slice(0, 80)}" will be removed.`
        : "This entry will be removed.",
      destructive: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/agency/runs/${run.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      onDelete?.(run);
    } catch (e) {
      console.error("Failed to delete run:", e);
    }
  }

  return (
    <div
      className={cn(
        "group flex flex-wrap items-center gap-[8px] px-[16px] py-[12px]",
        "border-t border-[var(--color-stroke-soft)]",
        "hover:bg-[var(--color-bg-tint-2)]",
        "transition-colors",
        isRunning && "bg-[color-mix(in_oklab,var(--color-brand-400)_5%,transparent)]",
        isBreak && "bg-[color-mix(in_oklab,oklch(70%_0.15_80)_5%,transparent)]",
      )}
    >
      {/* Description */}
      <div className="flex min-w-0 flex-1 items-center gap-[8px]">
        {/* Agent chip */}
        {isMcp && (
          <span className="shrink-0 rounded-[4px] bg-[color-mix(in_oklab,var(--color-brand-400)_20%,transparent)] px-[5px] py-[2px] text-[10px] font-semibold uppercase tracking-wider text-[var(--color-brand-400)]">
            {agentLabel}
          </span>
        )}
        {isBreak && (
          <span className="shrink-0 rounded-[4px] bg-amber-900/40 px-[5px] py-[2px] text-[10px] font-semibold uppercase tracking-wider text-amber-400">
            Break
          </span>
        )}

        {editing && !isMcp ? (
          <input
            autoFocus
            type="text"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            onBlur={saveDesc}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveDesc();
              if (e.key === "Escape") {
                setEditDesc(run.prompt ?? "");
                setEditing(false);
              }
            }}
            className="flex-1 bg-transparent text-[14px] text-[var(--color-text-strong)] outline-none ring-1 ring-[var(--color-brand-400)] rounded-[4px] px-[6px] py-[2px]"
          />
        ) : (
          <button
            onClick={() => !isMcp && setEditing(true)}
            className={cn(
              "min-w-0 flex-1 truncate text-left text-[14px] text-[var(--color-text-strong)]",
              !run.prompt && "text-[var(--color-text-soft)]",
              !isMcp && "hover:text-[var(--color-brand-400)] cursor-text",
              isMcp && "cursor-default",
            )}
          >
            {isMcp
              ? (run.prompt || `${agentLabel} session ${run.id.slice(-6)}`)
              : isBreak
              ? "Break"
              : (run.prompt || "(no description)")}
          </button>
        )}
      </div>

      {/* Project pill */}
      <div className="shrink-0">
        {project ? (
          <span className="flex items-center gap-[5px] rounded-[6px] bg-[var(--color-bg-tint-5)] px-[8px] py-[3px] text-[12px] text-[var(--color-text-sub)]">
            <span
              className="size-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <span className="max-w-[140px] truncate">
              {project.name}
              {client ? (
                <span className="text-[var(--color-text-soft)]"> · {client.name}</span>
              ) : null}
            </span>
          </span>
        ) : null}
      </div>

      {/* Tags icon (placeholder) */}
      <div className="relative shrink-0">
        <button
          onClick={() => setTagsOpen((v) => !v)}
          className="flex size-[28px] items-center justify-center rounded-[6px] text-[var(--color-text-soft)] opacity-0 group-hover:opacity-100 hover:bg-[var(--color-bg-tint-6)] transition-all"
        >
          <RiPriceTag3Line size={13} />
        </button>
        {tagsOpen && (
          <div className="absolute right-0 top-full z-50 mt-[6px] min-w-[160px] rounded-[8px] bg-[var(--color-bg-surface-elevated)] p-[10px] ring-1 ring-[var(--color-stroke-sub)] shadow-[var(--shadow-regular-lg)] text-[12px] text-[var(--color-text-soft)]">
            Tags coming soon
          </div>
        )}
      </div>

      {/* Billable toggle */}
      {!isBreak && (
        <button
          onClick={toggleBillable}
          disabled={isMcp}
          className={cn(
            "shrink-0 rounded-[4px] px-[6px] py-[2px] text-[12px] font-semibold transition-colors",
            billable
              ? "bg-[color-mix(in_oklab,var(--color-brand-400)_15%,transparent)] text-[var(--color-brand-400)]"
              : "text-[var(--color-text-soft)] opacity-0 group-hover:opacity-100",
            isMcp && "cursor-default",
          )}
        >
          $
        </button>
      )}

      {/* Time range */}
      <span className="shrink-0 text-[12px] tabular-nums text-[var(--color-text-soft)]">
        {formatTime(run.startedAt)}
        {run.endedAt ? ` – ${formatTime(run.endedAt)}` : " – …"}
      </span>

      {/* Cost / billable amount */}
      {!isBreak && (run.billableUsd > 0 || run.costUsd > 0) && (
        <span
          className={cn(
            "shrink-0 min-w-[68px] text-right font-mono text-[12px] tabular-nums",
            "tooltip-cost",
          )}
          title={
            isMcp
              ? `Bill ${formatCurrency(run.billableUsd, 2, currency)} · AI cost ${formatCurrency(run.costUsd, 4, currency)} · margin ${formatCurrency(run.billableUsd - run.costUsd, 2, currency)}`
              : `Billable ${formatCurrency(run.billableUsd, 2, currency)} at ${formatCurrency(run.rateUsd, 0, currency)}/h`
          }
        >
          {run.billableUsd > 0 ? (
            <span className="font-semibold text-[var(--color-brand-400)]">
              {formatCurrency(run.billableUsd, 2, currency)}
            </span>
          ) : (
            <span className="text-[var(--color-text-soft)]">
              {formatCurrency(run.costUsd, 4, currency)}
            </span>
          )}
        </span>
      )}

      {/* Duration */}
      <span
        className={cn(
          "w-[80px] shrink-0 text-right font-mono text-[14px] font-semibold tabular-nums",
          isRunning
            ? isBreak
              ? "text-amber-400"
              : "text-[var(--color-brand-400)]"
            : "text-[var(--color-text-strong)]",
        )}
      >
        {formatClock(displaySec)}
      </span>

      {/* Replay — only for non-MCP, non-break runs */}
      {!isMcp && !isBreak && (
        <button
          onClick={() => onReplay?.(run)}
          className="flex size-[28px] shrink-0 items-center justify-center rounded-[6px] text-[var(--color-text-soft)] opacity-0 group-hover:opacity-100 hover:bg-[var(--color-bg-tint-6)] hover:text-[var(--color-brand-400)] transition-all"
          title="Replay"
        >
          <RiPlayLine size={14} />
        </button>
      )}
      {(isMcp || isBreak) && <div className="size-[28px] shrink-0" />}

      {/* Row menu */}
      <Dropdown>
        <DropdownTrigger asChild>
          <button className="flex size-[28px] shrink-0 items-center justify-center rounded-[6px] text-[var(--color-text-soft)] opacity-0 group-hover:opacity-100 hover:bg-[var(--color-bg-tint-6)] hover:text-[var(--color-text-strong)] transition-all">
            <RiMoreLine size={16} />
          </button>
        </DropdownTrigger>
        <DropdownContent>
          {!isMcp && (
            <DropdownItem onClick={() => setEditing(true)}>
              <RiPencilLine size={14} />
              Edit
            </DropdownItem>
          )}
          {!isMcp && !isBreak && (
            <DropdownItem onClick={() => onReplay?.(run)}>
              <RiFileCopyLine size={14} />
              Duplicate
            </DropdownItem>
          )}
          <DropdownItem asChild>
            <Link href={`/agency/runs/${run.id}`}>
              <RiExternalLinkLine size={14} />
              View timeline
            </Link>
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            onClick={handleDelete}
            className="text-red-400 data-[highlighted]:text-red-300"
          >
            <RiDeleteBinLine size={14} />
            Delete
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
    </div>
  );
}

function formatAgentLabel(agentName: string) {
  const raw = agentName.trim();
  const normalized = raw.toLowerCase();
  if (normalized.includes("claude")) return "Claude";
  if (normalized.includes("codex") || normalized.includes("gpt")) return "Codex";
  if (normalized.includes("opencode")) return "OpenCode";
  if (normalized.includes("cursor")) return "Cursor";
  if (normalized.includes("cline")) return "Cline";
  if (normalized.includes("windsurf")) return "Windsurf";
  if (!raw || normalized === "ai-agent" || normalized === "llm-session") {
    return "Agent";
  }
  return raw.length > 12 ? raw.slice(0, 12) : raw;
}
