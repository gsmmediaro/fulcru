import Link from "next/link";
import { notFound } from "next/navigation";
import {
  RiArrowLeftLine,
  RiArrowRightUpLine,
  RiBillLine,
  RiCpuLine,
  RiFolder3Line,
  RiPulseLine,
  RiReceiptLine,
  RiTimeLine,
} from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { ClientAvatar } from "@/components/agency/client-avatar";
import { InvoiceStatusPill } from "@/components/agency/invoice-status-pill";
import { getApi } from "@/lib/agency/server-api";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/cn";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getT();
  const { id } = await params;
  const api = await getApi();

  const project = await api.getProject(id);
  if (!project) notFound();

  const [client, settings, allRuns, expenses, invoices] = await Promise.all([
    api.getClient(project.clientId),
    api.getSettings(),
    api.listRuns({ projectId: project.id }),
    api.listExpenses({ projectId: project.id }),
    api.listInvoices(project.clientId),
  ]);
  if (!client) notFound();

  const currency = settings.businessCurrency || "USD";
  const usd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });

  const shippedRuns = allRuns.filter((r) => r.status === "shipped");
  const invoicedRunIds = new Set<string>();
  for (const inv of invoices) {
    if (inv.status === "void") continue;
    for (const li of inv.lineItems) {
      if (li.runId) invoicedRunIds.add(li.runId);
    }
  }
  const uninvoicedRuns = shippedRuns.filter((r) => !invoicedRunIds.has(r.id));

  const billableUsd = shippedRuns.reduce((s, r) => s + r.billableUsd, 0);
  const aiCostUsd = shippedRuns.reduce((s, r) => s + r.costUsd, 0);
  const activeHours =
    shippedRuns.reduce((s, r) => s + r.activeSec, 0) / 3600;
  const lifetimeHours =
    shippedRuns.reduce((s, r) => s + r.activeSec, 0) / 3600;
  const lifetimeBillable = shippedRuns.reduce(
    (s, r) => s + r.billableUsd,
    0,
  );

  const billableExpenses = expenses
    .filter((e) => e.billable && !e.invoiceId)
    .reduce((s, e) => s + e.amount, 0);
  const expenseCount = expenses.filter((e) => !e.invoiceId).length;

  // Invoices touching this project: any invoice whose line items reference a
  // run in this project. We resolve runIds against this project's run list.
  const projectRunIds = new Set(allRuns.map((r) => r.id));
  const projectInvoices = invoices.filter((inv) =>
    inv.lineItems.some((li) => li.runId && projectRunIds.has(li.runId)),
  );

  const sortedRecentRuns = [...shippedRuns]
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
    .slice(0, 25);

  return (
    <AppShell>
      <Link
        href="/agency/projects"
        className="inline-flex items-center gap-[6px] text-[12px] font-semibold text-[var(--color-text-soft)] hover:text-[var(--color-text-strong)]"
      >
        <RiArrowLeftLine size={14} />
        {t("nav.projects")}
      </Link>

      <div className="mt-[16px] flex flex-wrap items-start justify-between gap-[16px]">
        <div className="flex items-start gap-[14px]">
          <ProjectBadge color={project.color} />
          <div className="flex flex-col">
            <h1 className="text-[26px] font-semibold leading-[32px] tracking-tight sm:text-[28px] sm:leading-[34px]">
              {project.name}
            </h1>
            <div className="mt-[6px] flex flex-wrap items-center gap-[10px] text-[12px] text-[var(--color-text-soft)]">
              <Link
                href={`/agency/clients/${client.id}`}
                className="inline-flex items-center gap-[8px] rounded-[6px] bg-[var(--color-bg-tint-4)] px-[8px] py-[2px] font-semibold text-[var(--color-text-sub)] ring-1 ring-[var(--color-stroke-soft)] hover:text-[var(--color-text-strong)]"
              >
                <ClientAvatar
                  initials={client.initials}
                  accentColor={client.accentColor}
                  size={16}
                />
                {client.name}
              </Link>
              {project.description ? (
                <span className="text-[var(--color-text-soft)]">
                  {project.description}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-[8px]">
          <Link
            href={`/agency/runs?projectId=${project.id}`}
            className="inline-flex items-center gap-[6px] rounded-[8px] px-[14px] py-[8px] text-[13px] font-semibold text-[var(--color-text-soft)] ring-1 ring-[var(--color-stroke-soft)] hover:text-[var(--color-text-strong)]"
          >
            <RiPulseLine size={14} />
            {t("clients.viewRuns")}
          </Link>
          <Link
            href={`/agency/clients/${client.id}`}
            className="inline-flex items-center gap-[6px] rounded-[8px] bg-[var(--color-brand-100)] px-[14px] py-[8px] text-[13px] font-semibold text-[var(--color-brand-400)] ring-1 ring-[color-mix(in_oklab,var(--color-brand-400)_22%,transparent)] hover:bg-[color-mix(in_oklab,var(--color-brand-400)_14%,transparent)]"
          >
            <RiBillLine size={14} />
            {t("projects.openClientBilling")}
          </Link>
        </div>
      </div>

      <div className="enter-stagger mt-[24px] grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-4">
        <Hero
          icon={<RiTimeLine size={16} />}
          label="Billable time"
          value={usd.format(billableUsd)}
          sub={`${shippedRuns.length} ${t("projects.runs").toLowerCase()} - ${activeHours.toFixed(1)}h - ${uninvoicedRuns.length} uninvoiced`}
        />
        <Hero
          icon={<RiCpuLine size={16} />}
          label={t("projects.kpi.aiCost")}
          value={usd.format(aiCostUsd)}
          sub={t("projects.kpi.aiCostSub")}
          tone="muted"
        />
        <Hero
          icon={<RiReceiptLine size={16} />}
          label={t("projects.kpi.uninvoicedExpenses")}
          value={usd.format(billableExpenses)}
          sub={`${expenseCount} ${t("projects.kpi.expensesSub")}`}
        />
        <Hero
          icon={<RiPulseLine size={16} />}
          label={t("projects.kpi.lifetime")}
          value={`${lifetimeHours.toFixed(1)}h`}
          sub={`${shippedRuns.length} runs - ${usd.format(lifetimeBillable)}`}
          tone="muted"
        />
      </div>

      {projectInvoices.length > 0 ? (
        <section className="mt-[24px] rounded-[10px] bg-[var(--color-bg-surface)] p-[20px] ring-1 ring-[var(--color-stroke-soft)]">
          <header className="mb-[12px] flex items-center justify-between">
            <h2 className="tp-overline text-[var(--color-brand-400)]">
              {t("projects.kpi.invoicesTitle")}
            </h2>
            <span className="text-[11px] text-[var(--color-text-soft)] tabular-nums">
              {projectInvoices.length} total
            </span>
          </header>
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
                  <th className="px-[12px] pb-[10px] font-semibold">Number</th>
                  <th className="px-[12px] pb-[10px] font-semibold">Status</th>
                  <th className="px-[12px] pb-[10px] font-semibold">Issued</th>
                  <th className="px-[12px] pb-[10px] font-semibold">Due</th>
                  <th className="px-[12px] pb-[10px] text-right font-semibold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {projectInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-t border-[var(--color-stroke-soft)] hover:bg-[var(--color-bg-tint-2)]"
                  >
                    <td className="px-[12px] py-[12px] font-semibold text-[var(--color-text-strong)]">
                      <Link
                        href={`/agency/invoices/${inv.id}`}
                        className="inline-flex items-center gap-[6px] hover:text-[var(--color-brand-400)]"
                      >
                        {inv.number}
                        <RiArrowRightUpLine size={12} />
                      </Link>
                    </td>
                    <td className="px-[12px] py-[12px]">
                      <InvoiceStatusPill status={inv.status} />
                    </td>
                    <td className="px-[12px] py-[12px] tabular-nums text-[var(--color-text-soft)]">
                      {inv.issuedAt ? inv.issuedAt.slice(0, 10) : "-"}
                    </td>
                    <td className="px-[12px] py-[12px] tabular-nums text-[var(--color-text-soft)]">
                      {inv.dueAt ? inv.dueAt.slice(0, 10) : "-"}
                    </td>
                    <td className="px-[12px] py-[12px] text-right font-semibold tabular-nums text-[var(--color-text-strong)]">
                      {usd.format(inv.totalUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {sortedRecentRuns.length > 0 ? (
        <section className="mt-[16px] rounded-[10px] bg-[var(--color-bg-surface)] p-[20px] ring-1 ring-[var(--color-stroke-soft)]">
          <header className="mb-[12px] flex items-center justify-between">
            <h2 className="tp-overline text-[var(--color-brand-400)]">
              Recent runs
            </h2>
            <span className="text-[11px] text-[var(--color-text-soft)] tabular-nums">
              {t("projects.kpi.showingRecent", {
                n: String(sortedRecentRuns.length),
              })}
            </span>
          </header>
          <ul className="flex flex-col">
            {sortedRecentRuns.map((r) => {
              const invoiced = invoicedRunIds.has(r.id);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-[12px] border-t border-[var(--color-stroke-soft)] py-[10px] first:border-t-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-[var(--color-text-strong)]">
                      {r.prompt || `Run ${r.id.slice(-6)}`}
                    </div>
                    <div className="mt-[2px] text-[11px] text-[var(--color-text-soft)] tabular-nums">
                      {r.startedAt.slice(0, 10)} -{" "}
                      {(r.activeSec / 3600).toFixed(2)}h -{" "}
                      {r.kind === "mcp" ? formatAgentLabel(r.agentName) : "Manual"}
                      {invoiced ? " - invoiced" : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-semibold tabular-nums text-[var(--color-brand-400)]">
                      {usd.format(r.billableUsd)}
                    </div>
                    {r.costUsd > 0 ? (
                      <div className="text-[11px] tabular-nums text-[var(--color-text-soft)]">
                        AI {usd.format(r.costUsd)}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {expenses.length > 0 ? (
        <section className="mt-[16px] rounded-[10px] bg-[var(--color-bg-surface)] p-[20px] ring-1 ring-[var(--color-stroke-soft)]">
          <header className="mb-[12px] flex items-center justify-between">
            <h2 className="tp-overline text-[var(--color-brand-400)]">
              {t("projects.kpi.expensesTitle")}
            </h2>
            <span className="text-[11px] text-[var(--color-text-soft)] tabular-nums">
              {expenses.length} entries
            </span>
          </header>
          <ul className="flex flex-col">
            {expenses.slice(0, 25).map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-[12px] border-t border-[var(--color-stroke-soft)] py-[10px] first:border-t-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-[var(--color-text-strong)]">
                    {e.note || e.category}
                  </div>
                  <div className="mt-[2px] text-[11px] text-[var(--color-text-soft)] tabular-nums">
                    {e.date} · {e.category}
                    {e.invoiceId ? ` · invoiced` : ""}
                  </div>
                </div>
                <div className="text-[13px] font-semibold tabular-nums text-[var(--color-text-strong)]">
                  {usd.format(e.amount)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}

function Hero({
  icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "muted";
}) {
  return (
    <div className="rounded-[10px] bg-[var(--color-bg-surface)] p-[18px] ring-1 ring-[var(--color-stroke-soft)]">
      <div className="flex items-center gap-[8px] text-[11px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
        <span className="text-[var(--color-brand-400)]">{icon}</span>
        {label}
      </div>
      <div
        className={cn(
          "mt-[8px] text-[26px] font-semibold leading-[32px] tabular-nums",
          tone === "muted"
            ? "text-[var(--color-text-soft)]"
            : "text-[var(--color-text-strong)]",
        )}
      >
        {value}
      </div>
      <div className="mt-[2px] text-[12px] text-[var(--color-text-soft)]">
        {sub}
      </div>
    </div>
  );
}

function ProjectBadge({ color }: { color: string }) {
  return (
    <span
      className="flex size-[56px] shrink-0 items-center justify-center rounded-[12px] ring-1"
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 22%, #1a1a1a)`,
        color,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 35%, transparent)`,
      }}
    >
      <RiFolder3Line size={24} />
    </span>
  );
}

function formatAgentLabel(agentName: string) {
  const raw = agentName.trim();
  const normalized = raw.toLowerCase();
  if (normalized.includes("claude")) return "Claude";
  if (normalized.includes("codex") || normalized.includes("gpt")) return "Codex";
  if (normalized.includes("opencode")) return "OpenCode";
  if (normalized.includes("cursor")) return "Cursor";
  if (normalized.includes("cline")) return "Cline";
  if (normalized.includes("windsurf")) return "Windsurf";
  if (!raw || normalized === "ai-agent" || normalized === "llm-session") {
    return "Agent";
  }
  return raw.length > 12 ? raw.slice(0, 12) : raw;
}
