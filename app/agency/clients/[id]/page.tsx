import Link from "next/link";
import { notFound } from "next/navigation";
import {
  RiArrowLeftLine,
  RiArrowRightUpLine,
  RiBillLine,
  RiCpuLine,
  RiPulseLine,
  RiReceiptLine,
  RiTimeLine,
} from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { ClientAvatar } from "@/components/agency/client-avatar";
import { ClientEditButton } from "@/components/agency/client-edit-button";
import { SendInvoiceButton } from "@/components/agency/send-invoice-button";
import { InvoiceStatusPill } from "@/components/agency/invoice-status-pill";
import { getApi } from "@/lib/agency/server-api";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/cn";

const TAX_OPTIONS = [
  { label: "0%", value: 0 },
  { label: "9%", value: 9 },
  { label: "19%", value: 19 },
];

export default async function ClientBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tax?: string }>;
}) {
  const { t } = await getT();
  const { id } = await params;
  const sp = await searchParams;
  const taxPct = (() => {
    const n = Number(sp?.tax);
    if (!Number.isFinite(n) || n < 0 || n > 100) return 0;
    return n;
  })();

  const api = await getApi();
  const client = await api.getClient(id);
  if (!client) notFound();

  const settings = await api.getSettings();
  const currency = settings.businessCurrency || "USD";
  const usd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
  const usdRound = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  const [summary, uninvoicedRuns, invoices, uninvoicedExpenses] =
    await Promise.all([
      api.clientBillingSummary(id),
      api.listUninvoicedRunsForClient(id, 25),
      api.listInvoices(id),
      api.listExpenses({ clientId: id, billable: true, invoiceId: null }),
    ]);

  const subtotalNext =
    summary.uninvoicedRuns.billableUsd + summary.uninvoicedExpenses.amountUsd;
  const taxNext = (subtotalNext * taxPct) / 100;
  const totalNext = subtotalNext + taxNext;
  const realCost =
    summary.costMode === "subscription"
      ? summary.uninvoicedRuns.amortizedSubCostUsd
      : summary.uninvoicedRuns.aiCostUsd;
  const costLabel =
    summary.costMode === "subscription"
      ? "Your cost (sub amortized)"
      : "AI cost (tokens)";
  const marginNext = subtotalNext - realCost;
  const marginPct = subtotalNext > 0 ? (marginNext / subtotalNext) * 100 : 0;

  return (
    <AppShell>
      <Link
        href="/agency/clients"
        className="inline-flex items-center gap-[6px] text-[12px] font-semibold text-[var(--color-text-soft)] hover:text-[var(--color-text-strong)]"
      >
        <RiArrowLeftLine size={14} />
        {t("nav.clients")}
      </Link>

      <div className="mt-[16px] flex flex-wrap items-start justify-between gap-[16px]">
        <div className="flex items-start gap-[14px]">
          <ClientAvatar
            initials={client.initials}
            accentColor={client.accentColor}
          />
          <div className="flex flex-col">
            <h1 className="text-[26px] font-semibold leading-[32px] tracking-tight sm:text-[28px] sm:leading-[34px]">
              {client.name}
            </h1>
            <div className="mt-[4px] flex flex-wrap items-center gap-[8px] text-[12px] text-[var(--color-text-soft)]">
              <span className="inline-flex rounded-[6px] bg-[var(--color-bg-tint-4)] px-[8px] py-[2px] font-semibold text-[var(--color-text-sub)] ring-1 ring-[var(--color-stroke-soft)] tabular-nums">
                {usdRound.format(client.hourlyRate)}/h
              </span>
              {client.email ? <span>{client.email}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-[8px]">
          <Link
            href={`/agency/runs?clientId=${client.id}`}
            className="inline-flex items-center gap-[6px] rounded-[8px] px-[14px] py-[8px] text-[13px] font-semibold text-[var(--color-text-soft)] ring-1 ring-[var(--color-stroke-soft)] hover:text-[var(--color-text-strong)]"
          >
            <RiPulseLine size={14} />
            {t("clients.viewRuns")}
          </Link>
          <SendInvoiceButton
            clientId={client.id}
            hasUninvoicedWork={subtotalNext > 0}
          />
          <ClientEditButton client={client} />
        </div>
      </div>

      <div className="enter-stagger mt-[24px] grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-4">
        <Hero
          icon={<RiTimeLine size={16} />}
          label="Uninvoiced time"
          value={usd.format(summary.uninvoicedRuns.billableUsd)}
          sub={`${summary.uninvoicedRuns.count} runs · ${summary.uninvoicedRuns.hours.toFixed(1)}h`}
        />
        <Hero
          icon={<RiCpuLine size={16} />}
          label={costLabel}
          value={usd.format(realCost)}
          sub={
            summary.costMode === "subscription"
              ? `share of subscription · ${summary.uninvoicedRuns.activeHours.toFixed(1)}h active`
              : "tokens spent on these runs"
          }
          tone="muted"
        />
        <Hero
          icon={<RiReceiptLine size={16} />}
          label="Uninvoiced expenses"
          value={usd.format(summary.uninvoicedExpenses.amountUsd)}
          sub={`${summary.uninvoicedExpenses.count} entries`}
        />
        <Hero
          icon={<RiBillLine size={16} />}
          label="Outstanding invoices"
          value={usd.format(summary.outstandingUsd)}
          sub={`${summary.invoices.sent.count} sent · ${summary.invoices.overdue.count} overdue`}
          tone={summary.invoices.overdue.count > 0 ? "warn" : "default"}
        />
      </div>

      {/* Suggested next invoice */}
      <section className="mt-[24px] rounded-[10px] bg-[var(--color-bg-surface)] p-[24px] ring-1 ring-[var(--color-stroke-soft)]">
        <header className="flex flex-wrap items-end justify-between gap-[16px]">
          <div>
            <h2 className="tp-overline text-[var(--color-brand-400)]">
              Suggested next invoice
            </h2>
            <p className="mt-[6px] text-[13px] text-[var(--color-text-soft)]">
              Everything billable that has not been invoiced yet for this client.
            </p>
          </div>
          <div className="inline-flex rounded-[8px] bg-[var(--color-bg-tint-3)] p-[4px] ring-1 ring-[var(--color-stroke-soft)]">
            {TAX_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={`/agency/clients/${client.id}?tax=${opt.value}`}
                className={cn(
                  "rounded-[6px] px-[12px] py-[5px] text-[12px] font-semibold transition-colors",
                  opt.value === taxPct
                    ? "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]"
                    : "text-[var(--color-text-soft)] hover:text-[var(--color-text-strong)]",
                )}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </header>

        <div className="mt-[20px] grid grid-cols-1 gap-[8px] md:grid-cols-2">
          <Row
            label="Time + tokens (billable)"
            value={usd.format(summary.uninvoicedRuns.billableUsd)}
          />
          <Row
            label="Billable expenses"
            value={usd.format(summary.uninvoicedExpenses.amountUsd)}
          />
          <Row label="Subtotal" value={usd.format(subtotalNext)} bold />
          <Row label={`Tax (${taxPct}%)`} value={usd.format(taxNext)} />
        </div>

        <div
          className={cn(
            "mt-[16px] flex flex-wrap items-baseline justify-between gap-[16px] rounded-[8px] p-[16px]",
            "bg-[color-mix(in_oklab,var(--color-brand-400)_10%,transparent)]",
            "ring-1 ring-[color-mix(in_oklab,var(--color-brand-400)_22%,transparent)]",
          )}
        >
          <div>
            <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-brand-400)]">
              Total to bill
            </div>
            <div className="mt-[2px] text-[12px] text-[var(--color-text-soft)]">
              {realCost > 0 ? (
                <>
                  Margin {usd.format(marginNext)} ({marginPct.toFixed(0)}%)
                  after {summary.costMode === "subscription" ? "sub cost" : "AI cost"}
                </>
              ) : (
                <>Pre-tax: {usd.format(subtotalNext)}</>
              )}
            </div>
          </div>
          <div className="text-[36px] font-semibold leading-[44px] tabular-nums text-[var(--color-text-strong)]">
            {usd.format(totalNext)}
          </div>
        </div>

        {subtotalNext === 0 ? (
          <p className="mt-[12px] text-[12px] text-[var(--color-text-soft)]">
            No uninvoiced billable activity for this client.
          </p>
        ) : null}
      </section>

      {/* Lifetime row */}
      <section className="mt-[16px] grid grid-cols-1 gap-[12px] sm:grid-cols-3">
        <Lifetime
          label="Lifetime billed"
          value={usd.format(summary.lifetimeBilledUsd)}
        />
        <Lifetime
          label="Lifetime paid"
          value={usd.format(summary.lifetimePaidUsd)}
        />
        <Lifetime
          label="Drafts"
          value={`${summary.invoices.draft.count} · ${usd.format(summary.invoices.draft.total)}`}
        />
      </section>

      {/* Invoices */}
      <section className="mt-[24px] rounded-[10px] bg-[var(--color-bg-surface)] p-[20px] ring-1 ring-[var(--color-stroke-soft)]">
        <header className="mb-[12px] flex items-center justify-between">
          <h2 className="tp-overline text-[var(--color-brand-400)]">Invoices</h2>
          <span className="text-[11px] text-[var(--color-text-soft)] tabular-nums">
            {invoices.length} total
          </span>
        </header>
        {invoices.length === 0 ? (
          <p className="px-[4px] py-[16px] text-[12px] text-[var(--color-text-soft)]">
            No invoices yet for this client.
          </p>
        ) : (
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
                {invoices.map((inv) => (
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
        )}
      </section>

      {/* Uninvoiced runs preview */}
      {uninvoicedRuns.length > 0 ? (
        <section className="mt-[16px] rounded-[10px] bg-[var(--color-bg-surface)] p-[20px] ring-1 ring-[var(--color-stroke-soft)]">
          <header className="mb-[12px] flex items-center justify-between">
            <h2 className="tp-overline text-[var(--color-brand-400)]">
              Uninvoiced runs
            </h2>
            <span className="text-[11px] text-[var(--color-text-soft)] tabular-nums">
              showing {uninvoicedRuns.length} most recent
            </span>
          </header>
          <ul className="flex flex-col">
            {uninvoicedRuns.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-[12px] border-t border-[var(--color-stroke-soft)] py-[10px] first:border-t-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-[var(--color-text-strong)]">
                    {r.prompt || `Run ${r.id.slice(-6)}`}
                  </div>
                  <div className="mt-[2px] text-[11px] text-[var(--color-text-soft)] tabular-nums">
                    {r.startedAt.slice(0, 10)} ·{" "}
                    {(r.runtimeSec / 3600).toFixed(2)}h ·{" "}
                    {r.kind === "mcp" ? formatAgentLabel(r.agentName) : "Manual"}
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
            ))}
          </ul>
        </section>
      ) : null}

      {/* Uninvoiced expenses preview */}
      {uninvoicedExpenses.length > 0 ? (
        <section className="mt-[16px] rounded-[10px] bg-[var(--color-bg-surface)] p-[20px] ring-1 ring-[var(--color-stroke-soft)]">
          <header className="mb-[12px] flex items-center justify-between">
            <h2 className="tp-overline text-[var(--color-brand-400)]">
              Uninvoiced expenses
            </h2>
            <span className="text-[11px] text-[var(--color-text-soft)] tabular-nums">
              {uninvoicedExpenses.length} entries
            </span>
          </header>
          <ul className="flex flex-col">
            {uninvoicedExpenses.map((e) => (
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
  tone?: "default" | "warn" | "muted";
}) {
  return (
    <div
      className={cn(
        "rounded-[10px] bg-[var(--color-bg-surface)] p-[18px] ring-1 ring-[var(--color-stroke-soft)]",
        tone === "warn" &&
          "ring-[color-mix(in_oklab,var(--color-accent-orange)_28%,transparent)]",
      )}
    >
      <div className="flex items-center gap-[8px] text-[11px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
        <span className="text-[var(--color-brand-400)]">{icon}</span>
        {label}
      </div>
      <div
        className={cn(
          "mt-[8px] text-[26px] font-semibold leading-[32px] tabular-nums",
          tone === "muted"
            ? "text-[var(--color-text-soft)]"
            : tone === "warn"
              ? "text-[var(--color-accent-orange)]"
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

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-[6px] px-[10px] py-[8px]",
        "bg-[var(--color-bg-tint-2)]",
      )}
    >
      <span
        className={cn(
          "text-[12px]",
          bold
            ? "font-semibold text-[var(--color-text-strong)]"
            : "text-[var(--color-text-soft)]",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums text-[13px]",
          bold
            ? "font-semibold text-[var(--color-text-strong)]"
            : "text-[var(--color-text-strong)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Lifetime({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[var(--color-bg-surface)] px-[16px] py-[14px] ring-1 ring-[var(--color-stroke-soft)]">
      <div className="text-[11px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
        {label}
      </div>
      <div className="mt-[4px] text-[18px] font-semibold tabular-nums text-[var(--color-text-strong)]">
        {value}
      </div>
    </div>
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
