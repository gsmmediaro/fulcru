import * as React from "react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  RiToolsLine,
  RiLightbulbFlashLine,
  RiGitBranchLine,
  RiFileEditLine,
  RiFlagLine,
  RiShieldKeyholeLine,
  RiShieldCheckLine,
  RiAlertLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { cn } from "@/lib/cn";
import type { RunEvent, RunEventKind } from "@/lib/agency/types";

const KIND_META: Record<
  RunEventKind,
  {
    label: string;
    icon: RemixiconComponentType;
    dot: string;
    icon_color: string;
    text: string;
  }
> = {
  tool_call: {
    label: "Tool call",
    icon: RiToolsLine,
    dot: "bg-[#2a2d31] ring-1 ring-[var(--color-stroke-strong)]",
    icon_color: "text-[var(--color-text-strong)]",
    text: "text-[var(--color-text-sub)]",
  },
  thought: {
    label: "Thought",
    icon: RiLightbulbFlashLine,
    dot: "bg-[var(--color-brand-400)]",
    icon_color: "text-[#0b1f21]",
    text: "text-[var(--color-brand-400)]",
  },
  decision: {
    label: "Decision",
    icon: RiGitBranchLine,
    dot: "bg-amber-400",
    icon_color: "text-amber-950",
    text: "text-amber-300",
  },
  file_edit: {
    label: "File edit",
    icon: RiFileEditLine,
    dot: "bg-sky-400",
    icon_color: "text-sky-950",
    text: "text-sky-300",
  },
  milestone: {
    label: "Milestone",
    icon: RiFlagLine,
    dot: "bg-emerald-400",
    icon_color: "text-emerald-950",
    text: "text-emerald-300",
  },
  approval_requested: {
    label: "Approval requested",
    icon: RiShieldKeyholeLine,
    dot: "bg-[#2a2218] ring-2 ring-amber-300/70",
    icon_color: "text-amber-200",
    text: "text-amber-300",
  },
  approval_resolved: {
    label: "Approval resolved",
    icon: RiShieldCheckLine,
    dot: "bg-emerald-400",
    icon_color: "text-emerald-950",
    text: "text-emerald-300",
  },
  error: {
    label: "Error",
    icon: RiAlertLine,
    dot: "bg-rose-400",
    icon_color: "text-rose-950",
    text: "text-rose-300",
  },
};

export function RunTimeline({ events }: { events: RunEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-[8px] bg-[var(--color-bg-surface)] p-[24px] text-center text-[13px] text-[var(--color-text-soft)] ring-1 ring-[var(--color-stroke-soft)]">
        No events yet - they'll appear here as the agent works.
      </div>
    );
  }
  return (
    <div
      className={cn(
        "rounded-[8px] bg-[var(--color-bg-surface)] p-[20px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <div className="tp-overline text-[var(--color-brand-400)]">Timeline</div>
      <ol className="relative mt-[16px] flex flex-col gap-[14px]">
        <span
          aria-hidden
          className="absolute left-[15px] top-[8px] bottom-[8px] w-px bg-[var(--color-stroke-soft)]"
        />
        {events.map((e) => {
          const meta = KIND_META[e.kind];
          const Icon = meta.icon;
          return (
            <li key={e.id} className="relative flex gap-[14px]">
              <span
                className={cn(
                  "relative z-10 flex size-[32px] shrink-0 items-center justify-center rounded-full",
                  meta.dot,
                )}
              >
                <Icon size={15} className={meta.icon_color} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-baseline justify-between gap-[12px]">
                  <span
                    className={cn(
                      "text-[12px] font-semibold uppercase tracking-[0.04em]",
                      meta.text,
                    )}
                  >
                    {meta.label}
                  </span>
                  <span
                    suppressHydrationWarning
                    className="shrink-0 text-[11px] tabular-nums text-[var(--color-text-soft)]"
                  >
                    {formatDistanceToNowStrict(new Date(e.ts), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <span className="mt-[2px] text-[13px] leading-[18px] text-[var(--color-text-strong)]">
                  {e.label}
                </span>
                {e.detail ? (
                  <span className="mt-[2px] text-[12px] leading-[16px] text-[var(--color-text-soft)]">
                    {e.detail}
                  </span>
                ) : null}
                {e.durationMs && e.durationMs > 0 ? (
                  <span
                    className={cn(
                      "mt-[6px] inline-flex w-fit items-center rounded-[5px] px-[6px] py-[1px]",
                      "bg-[var(--color-bg-tint-6)]",
                      "text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-soft)] tabular-nums",
                    )}
                  >
                    {e.durationMs >= 1000
                      ? `${(e.durationMs / 1000).toFixed(1)}s`
                      : `${e.durationMs}ms`}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
