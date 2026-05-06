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
    ring?: string;
  }
> = {
  tool_call: {
    label: "Tool call",
    icon: RiToolsLine,
    dot: "bg-[color-mix(in_oklab,white_14%,transparent)] ring-1 ring-[color-mix(in_oklab,white_18%,transparent)]",
    icon_color: "text-[var(--color-text-strong)]",
    text: "text-[var(--color-text-sub)]",
  },
  thought: {
    label: "Thought",
    icon: RiLightbulbFlashLine,
    dot: "bg-[var(--color-brand-400)] shadow-[0_4px_14px_-4px_color-mix(in_oklab,var(--color-brand-400)_70%,transparent)]",
    icon_color: "text-[var(--color-bg-surface)]",
    text: "text-[var(--color-brand-400)]",
  },
  decision: {
    label: "Decision",
    icon: RiGitBranchLine,
    dot: "bg-amber-400 shadow-[0_4px_14px_-4px_rgb(251_191_36/0.7)]",
    icon_color: "text-amber-950",
    text: "text-amber-300",
  },
  file_edit: {
    label: "File edit",
    icon: RiFileEditLine,
    dot: "bg-sky-400 shadow-[0_4px_14px_-4px_rgb(56_189_248/0.7)]",
    icon_color: "text-sky-950",
    text: "text-sky-300",
  },
  milestone: {
    label: "Milestone",
    icon: RiFlagLine,
    dot: "bg-emerald-400 shadow-[0_4px_14px_-4px_rgb(52_211_153/0.7)]",
    icon_color: "text-emerald-950",
    text: "text-emerald-300",
  },
  approval_requested: {
    label: "Approval requested",
    icon: RiShieldKeyholeLine,
    dot: "bg-amber-400/15 ring-2 ring-amber-300/70",
    icon_color: "text-amber-200",
    text: "text-amber-300",
  },
  approval_resolved: {
    label: "Approval resolved",
    icon: RiShieldCheckLine,
    dot: "bg-emerald-400 shadow-[0_4px_14px_-4px_rgb(52_211_153/0.7)]",
    icon_color: "text-emerald-950",
    text: "text-emerald-300",
  },
  error: {
    label: "Error",
    icon: RiAlertLine,
    dot: "bg-rose-400 shadow-[0_4px_14px_-4px_rgb(251_113_133/0.7)]",
    icon_color: "text-rose-950",
    text: "text-rose-300",
  },
};

export function RunTimeline({ events }: { events: RunEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-[12px] bg-[var(--color-bg-surface)] p-[24px] text-center text-[13px] text-[var(--color-text-soft)] ring-1 ring-[var(--color-stroke-soft)]">
        No events yet — they'll appear here as the agent works.
      </div>
    );
  }
  return (
    <div
      className={cn(
        "rounded-[12px] bg-[var(--color-bg-surface)] p-[20px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <div className="tp-overline text-[var(--color-brand-400)]">Timeline</div>
      <ol className="relative mt-[16px] flex flex-col gap-[14px]">
        <span
          aria-hidden
          className="absolute left-[15px] top-[8px] bottom-[8px] w-px bg-gradient-to-b from-[var(--color-stroke-soft)] via-[var(--color-stroke-soft)] to-transparent"
        />
        {events.map((e, i) => {
          const meta = KIND_META[e.kind];
          const Icon = meta.icon;
          return (
            <li
              key={e.id}
              className="group/evt relative flex gap-[14px]"
              style={{
                animation: `fade-rise 320ms ${i * 28}ms cubic-bezier(.22,1.2,.36,1) both`,
              }}
            >
              <span
                className={cn(
                  "relative z-10 flex size-[32px] shrink-0 items-center justify-center rounded-full",
                  "transition-transform duration-200 group-hover/evt:scale-[1.06]",
                  meta.dot,
                  meta.ring,
                )}
              >
                <Icon size={15} className={meta.icon_color} strokeWidth={1} />
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
                      "bg-[color-mix(in_oklab,white_6%,transparent)]",
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
