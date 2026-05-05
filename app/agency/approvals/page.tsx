import { RiShieldCheckLine } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { api } from "@/lib/agency/store";
import { ApprovalsView } from "@/components/agency/approvals-view";
import { cn } from "@/lib/cn";

export default function ApprovalsPage() {
  const all = api.listApprovals();
  const pendingApprovals = all.filter((a) => a.status === "pending");
  const resolvedApprovals = all.filter((a) => a.status !== "pending");

  const enrich = (a: (typeof all)[number]) => {
    const run = api.getRun(a.runId) ?? null;
    const skill = run ? (api.getSkill(run.skillId) ?? null) : null;
    const client = run ? (api.getClient(run.clientId) ?? null) : null;
    return { approval: a, run, skill, client };
  };

  const pending = pendingApprovals.map(enrich);
  const resolved = resolvedApprovals.map(enrich);

  const now = Date.now();
  const avgWaitMinutes =
    pendingApprovals.length > 0
      ? Math.round(
          pendingApprovals.reduce(
            (s, a) => s + (now - new Date(a.createdAt).getTime()),
            0,
          ) /
            pendingApprovals.length /
            60_000,
        )
      : 0;

  return (
    <AppShell>
      <div className="flex items-center gap-[14px]">
        <span
          className={cn(
            "flex size-[44px] shrink-0 items-center justify-center rounded-full",
            "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
          )}
        >
          <RiShieldCheckLine size={20} />
        </span>
        <div className="flex flex-col">
          <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
            Approvals
          </h1>
          <p className="mt-[2px] text-[13px] text-[var(--color-text-soft)]">
            Human-in-the-loop gates flagged by agent runs.
          </p>
        </div>
      </div>

      <div className="mt-[24px]">
        <ApprovalsView
          pending={pending}
          resolved={resolved}
          pendingCount={pendingApprovals.length}
          avgWaitMinutes={avgWaitMinutes}
        />
      </div>
    </AppShell>
  );
}
