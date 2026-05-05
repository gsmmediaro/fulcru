import { cn } from "@/lib/cn";
import type { RunStatus } from "@/lib/agency/types";

const STATUS_LABEL: Record<RunStatus, string> = {
  running: "Running",
  awaiting_approval: "Awaiting approval",
  shipped: "Shipped",
  failed: "Failed",
  cancelled: "Cancelled",
};

const STATUS_CLASSES: Record<RunStatus, string> = {
  running:
    "bg-[color-mix(in_oklab,var(--color-brand-400)_18%,transparent)] text-[var(--color-brand-400)] ring-[color-mix(in_oklab,var(--color-brand-400)_28%,transparent)]",
  awaiting_approval:
    "bg-[color-mix(in_oklab,#f59e0b_18%,transparent)] text-amber-300 ring-[color-mix(in_oklab,#f59e0b_28%,transparent)]",
  shipped:
    "bg-[color-mix(in_oklab,var(--color-accent-green)_18%,transparent)] text-emerald-300 ring-[color-mix(in_oklab,var(--color-accent-green)_28%,transparent)]",
  failed:
    "bg-[color-mix(in_oklab,#f43f5e_18%,transparent)] text-rose-300 ring-[color-mix(in_oklab,#f43f5e_28%,transparent)]",
  cancelled:
    "bg-[color-mix(in_oklab,white_6%,transparent)] text-[var(--color-text-soft)] ring-[var(--color-stroke-soft)]",
};

export function StatusPill({
  status,
  className,
}: {
  status: RunStatus;
  className?: string;
}) {
  const showDot = status === "running" || status === "awaiting_approval";
  const dotColor =
    status === "running"
      ? "var(--color-brand-400)"
      : status === "awaiting_approval"
        ? "#f59e0b"
        : "var(--color-text-soft)";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[6px] rounded-[6px] px-[8px] py-[3px]",
        "text-[11px] font-semibold ring-1",
        STATUS_CLASSES[status],
        className,
      )}
    >
      {showDot ? (
        <span className="relative inline-flex size-[6px] items-center justify-center">
          <span
            className="breathe-dot absolute inline-flex size-[6px] rounded-full"
            style={{ backgroundColor: dotColor }}
          />
          <span
            className="relative inline-flex size-[6px] rounded-full"
            style={{ backgroundColor: dotColor }}
          />
        </span>
      ) : null}
      {STATUS_LABEL[status]}
    </span>
  );
}
