"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { RiCheckLine, RiCloseLine } from "@remixicon/react";
import { cn } from "@/lib/cn";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KpiCard } from "@/components/agency/kpi-card";
import { StatusPill } from "@/components/agency/status-pill";
import type { Approval, Client, Run, Skill } from "@/lib/agency/types";

type ApprovalRow = {
  approval: Approval;
  run: Run | null;
  skill: Skill | null;
  client: Client | null;
};

type Props = {
  pending: ApprovalRow[];
  resolved: ApprovalRow[];
  pendingCount: number;
  avgWaitMinutes: number;
};

export function ApprovalsView({
  pending,
  resolved,
  pendingCount,
  avgWaitMinutes,
}: Props) {
  return (
    <div className="enter-stagger flex flex-col gap-[16px] sm:gap-[20px]">
      <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Pending"
          value={pendingCount}
          deltaTone={pendingCount > 0 ? "negative" : "positive"}
          delta={pendingCount > 0 ? "needs review" : "all clear"}
        />
        <KpiCard
          label="Avg wait"
          value={`${avgWaitMinutes}m`}
          hint="across pending approvals"
        />
        <KpiCard
          label="Resolved · all-time"
          value={resolved.length}
          hint="approvals processed"
        />
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved ({resolved.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-[16px]">
          <CardList rows={pending} mode="pending" />
        </TabsContent>
        <TabsContent value="resolved" className="mt-[16px]">
          <CardList rows={resolved} mode="resolved" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CardList({
  rows,
  mode,
}: {
  rows: ApprovalRow[];
  mode: "pending" | "resolved";
}) {
  if (rows.length === 0) {
    return (
      <div
        className={cn(
          "rounded-[8px] p-[32px] text-center ring-1",
          mode === "pending"
            ? "bg-[color-mix(in_oklab,var(--color-brand-400)_5%,var(--color-bg-surface))] ring-[color-mix(in_oklab,var(--color-brand-400)_18%,transparent)]"
            : "bg-[var(--color-bg-surface)] ring-[var(--color-stroke-soft)]",
        )}
      >
        <div className="text-[14px] font-semibold text-[var(--color-text-strong)]">
          {mode === "pending" ? "All clear" : "Nothing here yet"}
        </div>
        <div className="mt-[4px] text-[13px] text-[var(--color-text-soft)]">
          {mode === "pending"
            ? "No approvals waiting - every agent is unblocked."
            : "Resolved approvals will land here once you act on the first one."}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[12px]">
      {rows.map((r) => (
        <ApprovalCard key={r.approval.id} row={r} mode={mode} />
      ))}
    </div>
  );
}

function ApprovalCard({
  row,
  mode,
}: {
  row: ApprovalRow;
  mode: "pending" | "resolved";
}) {
  const router = useRouter();
  const { approval, run, skill, client } = row;
  const [pending, setPending] = React.useState<"approved" | "rejected" | null>(
    null,
  );

  async function resolve(status: "approved" | "rejected") {
    setPending(status);
    try {
      await fetch(`/api/agency/approvals/${approval.id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ status }),
        headers: { "content-type": "application/json" },
      });
    } catch {
      /* fall through to refresh */
    } finally {
      router.refresh();
    }
  }

  return (
    <article
      className={cn(
        "rounded-[8px] bg-[var(--color-bg-surface)] p-[20px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
        "transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:ring-[var(--color-stroke-sub)]",
        pending !== null && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-[16px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[10px]">
          <div className="flex flex-wrap items-center gap-[10px] text-[12px] text-[var(--color-text-soft)]">
            {run ? (
              <Link
                href={`/agency/runs/${run.id}`}
                className="font-mono text-[12px] text-[var(--color-text-strong)] hover:text-[var(--color-brand-400)]"
              >
                {run.id}
              </Link>
            ) : null}
            {skill ? (
              <>
                <span>·</span>
                <span className="text-[var(--color-text-sub)]">{skill.name}</span>
              </>
            ) : null}
            {client ? (
              <>
                <span>·</span>
                <span>{client.name}</span>
              </>
            ) : null}
            <span>·</span>
            <span suppressHydrationWarning>
              opened{" "}
              {formatDistanceToNowStrict(new Date(approval.createdAt), {
                addSuffix: true,
              })}
            </span>
            {mode === "resolved" && approval.resolvedAt ? (
              <>
                <span>·</span>
                <span suppressHydrationWarning>
                  resolved{" "}
                  {formatDistanceToNowStrict(new Date(approval.resolvedAt), {
                    addSuffix: true,
                  })}
                </span>
              </>
            ) : null}
          </div>

          <h3 className="text-[16px] font-semibold leading-[22px] text-[var(--color-text-strong)] sm:text-[17px]">
            {approval.question}
          </h3>

          {approval.context ? (
            <p className="text-[13px] text-[var(--color-text-soft)]">
              {approval.context}
            </p>
          ) : null}

          {mode === "resolved" ? (
            <div>
              <span
                className={cn(
                  "inline-flex items-center gap-[6px] rounded-[6px] px-[8px] py-[3px] text-[11px] font-semibold ring-1",
                  approval.status === "approved"
                    ? "bg-[color-mix(in_oklab,var(--color-accent-green)_18%,transparent)] text-emerald-300 ring-[color-mix(in_oklab,var(--color-accent-green)_28%,transparent)]"
                    : "bg-[color-mix(in_oklab,#f43f5e_18%,transparent)] text-rose-300 ring-[color-mix(in_oklab,#f43f5e_28%,transparent)]",
                )}
              >
                {approval.status === "approved" ? "Approved" : "Rejected"}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-[8px]">
          {run ? <StatusPill status={run.status} /> : null}
          {mode === "pending" ? (
            <div className="flex items-center gap-[6px]">
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => resolve("rejected")}
                className={cn(
                  "inline-flex h-[36px] items-center gap-[6px] rounded-[8px] px-[12px]",
                  "text-[13px] font-semibold text-[var(--color-text-sub)]",
                  "bg-transparent ring-1 ring-[var(--color-stroke-sub)]",
                  "transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "hover:text-rose-300 hover:ring-[color-mix(in_oklab,#fb7185_60%,transparent)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,#fb7185_70%,transparent)]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <RiCloseLine size={14} />
                Reject
              </button>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => resolve("approved")}
                className={cn(
                  "inline-flex h-[36px] items-center gap-[6px] rounded-[8px] px-[14px]",
                  "text-[13px] font-semibold",
                  "bg-[var(--color-brand-400)] text-[#0b1f21]",
                  "transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--color-brand-500)]",
                  "active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-surface)]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <RiCheckLine size={14} />
                Approve
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-[6px] opacity-40">
              <span className="inline-flex h-[36px] items-center gap-[6px] rounded-[8px] bg-transparent px-[12px] text-[13px] font-semibold text-[var(--color-text-soft)] ring-1 ring-[var(--color-stroke-sub)]">
                <RiCloseLine size={14} />
                Reject
              </span>
              <span className="inline-flex h-[36px] items-center gap-[6px] rounded-[8px] bg-[var(--color-brand-400)] px-[14px] text-[13px] font-semibold text-[#0b1f21]">
                <RiCheckLine size={14} />
                Approve
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
