import { AppShell } from "@/components/layout/app-shell";

export default function RunsLoading() {
  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <div className="flex items-center gap-[12px]">
          <span
            aria-hidden
            className="size-[40px] animate-pulse rounded-[10px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
          />
          <div
            aria-hidden
            className="h-[28px] w-[140px] animate-pulse rounded-[6px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
          />
        </div>
      </div>
      <div className="mt-[20px] space-y-[20px]">
        <div
          aria-hidden
          className="h-[64px] animate-pulse rounded-[10px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
        />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            aria-hidden
            className="h-[120px] animate-pulse rounded-[10px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </AppShell>
  );
}
