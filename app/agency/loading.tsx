import { AppShell } from "@/components/layout/app-shell";

export default function AgencyLoading() {
  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-[16px]">
        <div
          aria-hidden
          className="h-[36px] w-[200px] animate-pulse rounded-[6px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
        />
      </div>
      <div className="mt-[24px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            aria-hidden
            className="h-[200px] animate-pulse rounded-[8px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </AppShell>
  );
}
