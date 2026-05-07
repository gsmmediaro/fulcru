import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import {
  RiArrowLeftLine,
  RiExternalLinkLine,
  RiStopCircleLine,
} from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { getApi } from "@/lib/agency/server-api";
import { StatusPill } from "@/components/agency/status-pill";
import { AgentAvatar } from "@/components/agency/agent-avatar";
import { MetricRow } from "@/components/agency/metric-row";
import { RunTimeline } from "@/components/agency/run-timeline";
import { CopyIdButton } from "@/components/agency/copy-id-button";
import {
  formatCurrency,
  formatRuntime,
  formatTokens,
} from "@/lib/agency/format";
import { cn } from "@/lib/cn";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await getApi();
  const run = await api.getRun(id);
  if (!run) notFound();

  const [client, project, skill, events] = await Promise.all([
    api.getClient(run.clientId),
    api.getProject(run.projectId),
    api.getSkill(run.skillId),
    api.listRunEvents(run.id),
  ]);

  const runtimeHours = run.runtimeSec / 3600;
  const activeHours = run.activeSec / 3600;
  const activePct =
    run.runtimeSec > 0
      ? Math.round((run.activeSec / run.runtimeSec) * 100)
      : 0;
  const totalTokens = run.tokensIn + run.tokensOut;
  const cacheHitPct =
    run.tokensIn > 0 ? Math.round((run.cacheHits / run.tokensIn) * 100) : 0;
  const margin = run.billableUsd - run.costUsd;
  const marginPct =
    run.billableUsd > 0 ? Math.round((margin / run.billableUsd) * 100) : 0;
  const multiplier =
    runtimeHours > 0 ? run.baselineHours / runtimeHours : 0;
  const isLive =
    run.status === "running" || run.status === "awaiting_approval";

  return (
    <AppShell>
      <Link
        href="/agency/runs"
        className="inline-flex items-center gap-[6px] text-[12px] font-semibold text-[var(--color-text-soft)] hover:text-[var(--color-text-strong)]"
      >
        <RiArrowLeftLine size={14} />
        Back to runs
      </Link>

      <div className="mt-[12px] flex flex-wrap items-start justify-between gap-[16px]">
        <div className="flex flex-col gap-[8px]">
          <div className="flex flex-wrap items-center gap-[12px]">
            <h1 className="text-[24px] font-medium leading-[32px] tracking-tight sm:text-[28px]">
              {skill?.name ?? "Run"}
            </h1>
            <StatusPill status={run.status} />
          </div>
          <div className="flex flex-wrap items-center gap-[12px] text-[12px] text-[var(--color-text-soft)]">
            <span>
              Started{" "}
              <span className="text-[var(--color-text-sub)]">
                {formatDistanceToNowStrict(new Date(run.startedAt), {
                  addSuffix: true,
                })}
              </span>
            </span>
            {run.endedAt ? (
              <span>
                · Ended{" "}
                <span className="text-[var(--color-text-sub)]">
                  {formatDistanceToNowStrict(new Date(run.endedAt), {
                    addSuffix: true,
                  })}
                </span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-[8px]">
          <CopyIdButton value={run.id} />
          {run.deliverableUrl ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              trailingIcon={<RiExternalLinkLine size={14} />}
            >
              <a
                href={run.deliverableUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                View deliverable
              </a>
            </Button>
          ) : null}
          {isLive ? (
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<RiStopCircleLine size={14} />}
              className="border-rose-400/60 text-rose-300 hover:bg-rose-400/10 active:bg-rose-400/20"
            >
              Stop run
            </Button>
          ) : null}
        </div>
      </div>

      <div className="enter-stagger mt-[24px] flex flex-col gap-[16px] sm:gap-[20px]">
        <div className="grid grid-cols-1 gap-[12px] md:grid-cols-3">
          <MetricRow
            label="Runtime"
            value={formatRuntime(run.runtimeSec)}
            sub={
              <>
                <span className="tabular-nums text-[var(--color-text-sub)]">
                  {activePct}% active
                </span>{" "}
                · {formatRuntime(run.activeSec)} of inference
              </>
            }
          />
          <MetricRow
            label="Tokens"
            value={formatTokens(totalTokens)}
            sub={
              <>
                {formatTokens(run.tokensIn)} in · {formatTokens(run.tokensOut)}{" "}
                out ·{" "}
                <span className="tabular-nums text-[var(--color-text-sub)]">
                  {cacheHitPct}%
                </span>{" "}
                cache hit
              </>
            }
          />
          <MetricRow
            label="Cost vs Billable"
            value={
              <>
                {formatCurrency(run.costUsd, 2)}{" "}
                <span className="text-[14px] font-medium text-[var(--color-text-soft)]">
                  /
                </span>{" "}
                {run.billableUsd > 0
                  ? formatCurrency(run.billableUsd, 0)
                  : "—"}
              </>
            }
            accent={marginPct > 0 ? "emerald" : undefined}
            sub={
              run.billableUsd > 0 ? (
                <>
                  Margin{" "}
                  <span className="font-bold text-emerald-300 tabular-nums">
                    {marginPct}%
                  </span>{" "}
                  · {formatCurrency(margin, 0)}
                </>
              ) : (
                "Not yet shipped — no billable amount."
              )
            }
          />
        </div>

        <div
          className={cn(
            "rounded-[8px] p-[20px] ring-1",
            "bg-[color-mix(in_oklab,var(--color-brand-400)_8%,var(--color-bg-surface))]",
            "ring-[color-mix(in_oklab,var(--color-brand-400)_28%,transparent)]",
          )}
        >
          <div className="tp-overline text-[var(--color-brand-400)]">
            Effective hours
          </div>
          <div className="mt-[12px] flex flex-wrap items-baseline gap-x-[12px] gap-y-[4px]">
            <span className="text-[40px] font-bold leading-[44px] tracking-tight tabular-nums text-[var(--color-brand-400)] sm:text-[44px] sm:leading-[48px]">
              {formatCurrency(run.billableUsd, 2)}
            </span>
            <span className="text-[14px] tabular-nums text-[var(--color-text-soft)]">
              {run.baselineHours}h
              <span className="mx-[6px] text-[var(--color-text-soft)]">×</span>
              {formatCurrency(run.rateUsd, 0)}/h
            </span>
          </div>
          <p className="mt-[8px] max-w-[560px] text-[13px] text-[var(--color-text-soft)]">
            Billed against the skill baseline, not runtime. The agent pays for
            itself many times over against the human-equivalent quote.
          </p>
          <div className="mt-[16px] flex flex-wrap items-center gap-[8px] text-[12px]">
            <Pill>{runtimeHours.toFixed(2)}h runtime</Pill>
            <span className="text-[var(--color-text-soft)]">·</span>
            <Pill>{run.baselineHours}h effective</Pill>
            <span className="text-[var(--color-text-soft)]">·</span>
            <Pill tone="emerald">
              {multiplier > 0 ? `${multiplier.toFixed(1)}× leverage` : "—"}
            </Pill>
            {activeHours > 0 ? (
              <>
                <span className="text-[var(--color-text-soft)]">·</span>
                <Pill>{activeHours.toFixed(2)}h active</Pill>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-[16px] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-[20px]">
          <RunTimeline events={events} />

          <div className="flex flex-col gap-[16px]">
            {skill ? (
              <SidebarCard label="Skill">
                <div className="text-[14px] font-semibold text-[var(--color-text-strong)]">
                  {skill.name}
                </div>
                <p className="mt-[4px] text-[12px] text-[var(--color-text-soft)]">
                  {skill.description}
                </p>
                <dl className="mt-[12px] grid grid-cols-2 gap-[10px] text-[12px]">
                  <SidebarStat label="Baseline" value={`${skill.baselineHours}h`} />
                  <SidebarStat label="Modifier" value={`${skill.rateModifier}×`} />
                  <SidebarStat
                    label="Rate"
                    value={`${formatCurrency(run.rateUsd, 0)}/h`}
                  />
                  <SidebarStat
                    label="Category"
                    value={skill.category}
                    capitalize
                  />
                </dl>
              </SidebarCard>
            ) : null}

            {client && project ? (
              <SidebarCard label="Client / Project">
                <div className="flex items-start gap-[12px]">
                  <span
                    className="mt-[4px] h-[36px] w-[3px] shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[14px] font-semibold text-[var(--color-text-strong)]">
                      {client.name}
                    </span>
                    <span className="text-[12px] text-[var(--color-text-soft)]">
                      {project.name}
                    </span>
                    {project.description ? (
                      <span className="mt-[6px] text-[12px] text-[var(--color-text-soft)]">
                        {project.description}
                      </span>
                    ) : null}
                  </div>
                </div>
              </SidebarCard>
            ) : null}

            <SidebarCard label="Agent">
              <div className="flex items-center gap-[12px]">
                <AgentAvatar name={run.agentName} size={36} />
                <div className="flex flex-col">
                  <span className="font-mono text-[13px] text-[var(--color-text-strong)]">
                    {run.agentName}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-soft)]">
                    Autonomous agent
                  </span>
                </div>
              </div>
            </SidebarCard>

            <SidebarCard label="AI cost breakdown">
              <dl className="grid grid-cols-2 gap-y-[8px] text-[12px]">
                <SidebarStat
                  label="Input tokens"
                  value={formatTokens(run.tokensIn)}
                />
                <SidebarStat
                  label="Output tokens"
                  value={formatTokens(run.tokensOut)}
                />
                <SidebarStat
                  label="Cache hits"
                  value={`${cacheHitPct}%`}
                />
                <SidebarStat
                  label="Cost"
                  value={formatCurrency(run.costUsd, 2)}
                />
              </dl>
            </SidebarCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "emerald";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-[6px] px-[8px] py-[3px] text-[12px] font-semibold tabular-nums",
        "bg-[color-mix(in_oklab,white_4%,transparent)] text-[var(--color-text-sub)]",
        tone === "emerald" &&
          "bg-[color-mix(in_oklab,var(--color-accent-green)_18%,transparent)] text-emerald-300",
      )}
    >
      {children}
    </span>
  );
}

function SidebarCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[8px] bg-[var(--color-bg-surface)] p-[16px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <div className="tp-overline text-[var(--color-text-soft)]">{label}</div>
      <div className="mt-[10px]">{children}</div>
    </div>
  );
}

function SidebarStat({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
        {label}
      </dt>
      <dd
        className={cn(
          "text-[13px] font-semibold tabular-nums text-[var(--color-text-strong)]",
          capitalize && "capitalize",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
