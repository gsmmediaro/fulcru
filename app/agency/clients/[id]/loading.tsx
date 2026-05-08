import { AppShell } from "@/components/layout/app-shell";

export default function ClientBillingLoading() {
  return (
    <AppShell>
      <div
        aria-hidden
        className="h-[14px] w-[80px] animate-pulse rounded-[4px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
      />
      <div className="mt-[16px] flex items-center gap-[14px]">
        <span
          aria-hidden
          className="size-[44px] animate-pulse rounded-full bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
        />
        <div className="flex flex-col gap-[6px]">
          <div
            aria-hidden
            className="h-[28px] w-[220px] animate-pulse rounded-[6px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
          />
          <div
            aria-hidden
            className="h-[14px] w-[160px] animate-pulse rounded-[4px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
          />
        </div>
      </div>
      <div className="mt-[24px] grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            aria-hidden
            className="h-[110px] animate-pulse rounded-[10px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      <div
        aria-hidden
        className="mt-[24px] h-[280px] animate-pulse rounded-[10px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
      />
    </AppShell>
  );
}
