import type { Run } from "@/lib/agency/types";

export type DayGroup = {
  label: string; // "Today", "Yesterday", "Mon, May 5", …
  dateKey: string; // "YYYY-MM-DD" in local time
  runs: Run[];
  totalSec: number; // non-break total
};

/** Format seconds as HH:MM:SS */
export function formatClock(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Format seconds as H:MM:SS (no leading zero on hours) */
export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Format a timestamp to HH:MM in local time */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

/** Get YYYY-MM-DD in local time */
export function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = (d.getMonth() + 1).toString().padStart(2, "0");
  const dy = d.getDate().toString().padStart(2, "0");
  return `${y}-${mo}-${dy}`;
}

/** Get today's YYYY-MM-DD */
export function todayKey(): string {
  return localDateKey(new Date().toISOString());
}

/** Get yesterday's YYYY-MM-DD */
export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateKey(d.toISOString());
}

/** Get Monday of this week as YYYY-MM-DD */
export function weekStartKey(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return localDateKey(d.toISOString());
}

/** Format a YYYY-MM-DD key to a human-readable label */
export function dayLabel(dateKey: string, todayK: string, yesterdayK: string): string {
  if (dateKey === todayK) return "Today";
  if (dateKey === yesterdayK) return "Yesterday";
  const d = new Date(dateKey + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Group runs by local calendar day, sorted newest-first */
export function groupByDay(runs: Run[]): DayGroup[] {
  const todayK = todayKey();
  const yesterdayK = yesterdayKey();

  const map = new Map<string, Run[]>();
  for (const run of runs) {
    const key = localDateKey(run.startedAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(run);
  }

  // Sort keys descending
  const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

  return keys.map((key) => {
    const dayRuns = map.get(key)!;
    // Total = sum of non-break runtimeSec; for running runs, we add elapsed since started_at
    const totalSec = dayRuns
      .filter((r) => r.kind !== "break")
      .reduce((s, r) => {
        if (r.status === "running") {
          const elapsed = Math.round((Date.now() - new Date(r.startedAt).getTime()) / 1000);
          return s + elapsed;
        }
        return s + r.runtimeSec;
      }, 0);

    return {
      label: dayLabel(key, todayK, yesterdayK),
      dateKey: key,
      runs: dayRuns,
      totalSec,
    };
  });
}

/** Compute elapsed seconds since a started_at ISO string */
export function elapsedSec(startedAt: string): number {
  return Math.round((Date.now() - new Date(startedAt).getTime()) / 1000);
}

/** Compute week total seconds from runs that started this week (non-break) */
export function weekTotalSec(runs: Run[]): number {
  const wKey = weekStartKey();
  return runs
    .filter((r) => r.kind !== "break" && localDateKey(r.startedAt) >= wKey)
    .reduce((s, r) => {
      if (r.status === "running") {
        return s + elapsedSec(r.startedAt);
      }
      return s + r.runtimeSec;
    }, 0);
}

/** Get today's YYYY-MM-DD string for input[type=date] default */
export function todayInputValue(): string {
  return todayKey();
}

/** Convert HH:MM string to "HH:MM" for display */
export function parseTimeInput(val: string): string {
  const parts = val.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
