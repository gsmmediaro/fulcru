import { cn } from "@/lib/cn";

export function RemainingTrafficCard({
  remaining = -0.01,
  reserve = 0,
}: {
  remaining?: number;
  reserve?: number;
}) {
  // For visualization — clamp to a percentage
  const remainingDisplay = `${remaining.toFixed(2)} GB`;
  const reserveDisplay = `${reserve} GB`;

  return (
    <section
      className={cn(
        "rounded-[12px] bg-[var(--color-bg-surface)] p-[16px] sm:p-[20px] lg:p-[24px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <header className="mb-[16px]">
        <h2 className="tp-overline text-[var(--color-brand-400)]">
          Remaining traffic
        </h2>
      </header>

      <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2 sm:gap-[24px]">
        <Bar
          label="Plan traffic"
          value={remainingDisplay}
          tone={remaining < 0 ? "warn" : "ok"}
          ratio={Math.max(0, Math.min(1, (remaining + 1) / 1))}
        />
        <Bar
          label="Reserve traffic"
          value={reserveDisplay}
          tone="muted"
          ratio={0}
        />
      </div>

      <p className="mt-[16px] text-[12px] text-[var(--color-text-soft)]">
        Usage is based on the UTC time zone
      </p>
    </section>
  );
}

function Bar({
  label,
  value,
  ratio,
  tone,
}: {
  label: string;
  value: string;
  ratio: number;
  tone: "ok" | "warn" | "muted";
}) {
  const fill =
    tone === "warn"
      ? "bg-[var(--color-accent-orange)]"
      : tone === "ok"
        ? "bg-[var(--color-brand-400)]"
        : "bg-[var(--color-stroke-strong)]";

  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex items-baseline justify-between gap-[8px]">
        <span className="text-[13px] text-[var(--color-text-soft)]">
          {label}
        </span>
        <span
          className={cn(
            "text-[18px] font-semibold leading-[24px] tabular-nums",
            tone === "warn"
              ? "text-[var(--color-accent-orange)]"
              : "text-[var(--color-text-strong)]",
          )}
        >
          {value}
        </span>
      </div>
      <div
        className={cn(
          "h-[6px] w-full overflow-hidden rounded-full",
          "bg-[color-mix(in_oklab,white_4%,transparent)]",
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", fill)}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
