import { AppShell } from "@/components/layout/app-shell";

export default function ValueLoading() {
  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <div className="flex items-center gap-[14px]">
          <span
            aria-hidden
            className="size-[44px] animate-pulse rounded-[10px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
          />
          <div className="flex flex-col gap-[6px]">
            <div
              aria-hidden
              className="h-[28px] w-[200px] animate-pulse rounded-[6px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
            />
            <div
              aria-hidden
              className="h-[14px] w-[300px] animate-pulse rounded-[4px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
            />
          </div>
        </div>
        <div
          aria-hidden
          className="h-[36px] w-[400px] animate-pulse rounded-[8px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
        />
      </div>
      <div className="mt-[24px] grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            aria-hidden
            className="h-[120px] animate-pulse rounded-[8px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      <div className="mt-[20px] grid grid-cols-1 gap-[16px] lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            aria-hidden
            className="h-[260px] animate-pulse rounded-[8px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
            style={{ animationDelay: `${(i + 4) * 60}ms` }}
          />
        ))}
      </div>
    </AppShell>
  );
}
