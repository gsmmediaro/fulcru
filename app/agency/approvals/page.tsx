import { RiShieldCheckLine } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { getApi } from "@/lib/agency/server-api";
import { ApprovalsView } from "@/components/agency/approvals-view";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/cn";

export default async function ApprovalsPage() {
  const { t } = await getT();
  const api = await getApi();
  const all = await api.listApprovals();
  const pendingApprovals = all.filter((a) => a.status === "pending");
  const resolvedApprovals = all.filter((a) => a.status !== "pending");

  const enrich = async (a: (typeof all)[number]) => {
    const run = (await api.getRun(a.runId)) ?? null;
    const [skill, client] = await Promise.all([
      run ? api.getSkill(run.skillId).then((v) => v ?? null) : Promise.resolve(null),
      run?.clientId ? api.getClient(run.clientId).then((v) => v ?? null) : Promise.resolve(null),
    ]);
    return { approval: a, run, skill, client };
  };

  const [pending, resolved] = await Promise.all([
    Promise.all(pendingApprovals.map(enrich)),
    Promise.all(resolvedApprovals.map(enrich)),
  ]);

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
            "flex size-[44px] shrink-0 items-center justify-center rounded-[10px]",
            "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
          )}
        >
          <RiShieldCheckLine size={20} />
        </span>
        <div className="flex flex-col">
          <h1 className="text-[26px] font-semibold leading-[32px] tracking-tight sm:text-[28px] sm:leading-[34px]">
            {t("approvals.title")}
          </h1>
          <p className="mt-[2px] text-[13px] text-[var(--color-text-soft)]">
            {t("approvals.subtitle")}
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
