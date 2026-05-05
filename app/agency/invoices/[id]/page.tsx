import Link from "next/link";
import { notFound } from "next/navigation";
import { RiArrowLeftLine, RiCheckLine } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ClientAvatar } from "@/components/agency/client-avatar";
import { InvoiceStatusPill } from "@/components/agency/invoice-status-pill";
import { api } from "@/lib/agency/store";
import { cn } from "@/lib/cn";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toISOString().slice(0, 10);
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = api.getInvoice(id);
  if (!invoice) notFound();

  const client = api.getClient(invoice.clientId);
  const periodDays = Math.max(
    1,
    Math.round(
      (new Date(invoice.periodEnd).getTime() -
        new Date(invoice.periodStart).getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  );

  const lineRuns = invoice.lineItems
    .map((li) => ({ li, run: api.getRun(li.runId) }))
    .filter((x) => x.run);

  const effectiveTotal = lineRuns.reduce(
    (s, { li }) => s + li.hours,
    0,
  );
  const costTotal = lineRuns.reduce((s, { run }) => s + (run?.costUsd ?? 0), 0);
  const margin = invoice.subtotalUsd - costTotal;
  const marginPct =
    invoice.subtotalUsd > 0 ? (margin / invoice.subtotalUsd) * 100 : 0;

  return (
    <AppShell>
      <Link
        href="/agency/invoices"
        className="inline-flex items-center gap-[6px] text-[12px] font-semibold text-[var(--color-text-soft)] hover:text-[var(--color-text-strong)]"
      >
        <RiArrowLeftLine size={14} /> All invoices
      </Link>

      <div className="mt-[14px] flex flex-wrap items-start justify-between gap-[16px]">
        <div className="flex items-center gap-[14px]">
          <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
            {invoice.number}
          </h1>
          <InvoiceStatusPill status={invoice.status} />
        </div>
        {invoice.status !== "paid" ? (
          <Button leadingIcon={<RiCheckLine size={16} />}>Mark as paid</Button>
        ) : null}
      </div>

      <div className="enter-stagger mt-[24px] flex flex-col gap-[16px]">
        <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
          <Card title="From">
            <div className="font-semibold text-[var(--color-text-strong)]">
              Dictando Agency
            </div>
            <div className="mt-[2px] text-[13px] text-[var(--color-text-soft)]">
              contact@dictando.ro
            </div>
          </Card>
          <Card title="Bill to">
            {client ? (
              <div className="flex items-center gap-[12px]">
                <ClientAvatar
                  initials={client.initials}
                  accentColor={client.accentColor}
                  size={40}
                />
                <div>
                  <div className="font-semibold text-[var(--color-text-strong)]">
                    {client.name}
                  </div>
                  <div className="mt-[2px] text-[13px] text-[var(--color-text-soft)] tabular-nums">
                    {usd.format(client.hourlyRate)}/h base rate
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-[var(--color-text-soft)]">—</span>
            )}
          </Card>
        </div>

        <Card title="Period">
          <div className="grid grid-cols-3 gap-[12px]">
            <Mini label="From" value={fmtDate(invoice.periodStart)} />
            <Mini label="To" value={fmtDate(invoice.periodEnd)} />
            <Mini label="Days" value={`${periodDays}`} />
          </div>
          <div className="mt-[12px] grid grid-cols-2 gap-[12px] sm:grid-cols-4">
            <Mini label="Issued" value={fmtDate(invoice.issuedAt)} />
            <Mini label="Due" value={fmtDate(invoice.dueAt)} />
            <Mini label="Paid" value={fmtDate(invoice.paidAt)} />
            <Mini label="Line items" value={`${invoice.lineItems.length}`} />
          </div>
        </Card>

        <section className="rounded-[12px] bg-[var(--color-bg-surface)] p-[16px] ring-1 ring-[var(--color-stroke-soft)] sm:p-[20px]">
          <header className="mb-[12px]">
            <h2 className="tp-overline text-[var(--color-brand-400)]">Line items</h2>
          </header>
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
                  <th className="px-[12px] pb-[10px] font-semibold">Skill</th>
                  <th className="px-[12px] pb-[10px] font-semibold">Description</th>
                  <th className="px-[12px] pb-[10px] text-right font-semibold">Hours</th>
                  <th className="px-[12px] pb-[10px] text-right font-semibold">Rate</th>
                  <th className="px-[12px] pb-[10px] text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((li) => (
                  <tr
                    key={li.runId}
                    className="border-t border-[var(--color-stroke-soft)]"
                  >
                    <td className="px-[12px] py-[14px] font-semibold text-[var(--color-text-strong)]">
                      {li.skillName}
                    </td>
                    <td className="px-[12px] py-[14px] text-[var(--color-text-soft)]">
                      {li.description}
                    </td>
                    <td className="px-[12px] py-[14px] text-right tabular-nums text-[var(--color-text-sub)]">
                      {li.hours.toFixed(1)}h
                    </td>
                    <td className="px-[12px] py-[14px] text-right tabular-nums text-[var(--color-text-sub)]">
                      {usd.format(li.rateUsd)}
                    </td>
                    <td className="px-[12px] py-[14px] text-right font-semibold tabular-nums text-[var(--color-text-strong)]">
                      {usd.format(li.amountUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-[16px] flex justify-end">
            <dl className="w-full max-w-[320px] flex-col gap-[8px] rounded-[10px] bg-[color-mix(in_oklab,white_2%,transparent)] p-[16px] ring-1 ring-[var(--color-stroke-soft)]">
              <Row label="Subtotal" value={usd.format(invoice.subtotalUsd)} />
              <Row label="Tax" value={usd.format(invoice.taxUsd)} />
              <div className="my-[6px] border-t border-[var(--color-stroke-soft)]" />
              <Row
                label="Total"
                value={usd.format(invoice.totalUsd)}
                emphasize
              />
            </dl>
          </div>
        </section>

        <footer
          className={cn(
            "rounded-[12px] bg-[color-mix(in_oklab,var(--color-brand-400)_8%,var(--color-bg-surface))]",
            "p-[16px] text-[13px] text-[var(--color-text-sub)] ring-1 ring-[color-mix(in_oklab,var(--color-brand-400)_22%,transparent)]",
          )}
        >
          Effective hours total:{" "}
          <span className="font-semibold tabular-nums text-[var(--color-text-strong)]">
            {effectiveTotal.toFixed(1)}h
          </span>{" "}
          · Margin in this invoice:{" "}
          <span className="font-semibold tabular-nums text-emerald-300">
            {usd.format(margin)} ({marginPct.toFixed(1)}%)
          </span>
        </footer>
      </div>
    </AppShell>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[12px] bg-[var(--color-bg-surface)] p-[20px] ring-1 ring-[var(--color-stroke-soft)]">
      <h2 className="tp-overline text-[var(--color-brand-400)]">{title}</h2>
      <div className="mt-[10px]">{children}</div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
        {label}
      </div>
      <div className="mt-[2px] text-[14px] font-semibold tabular-nums text-[var(--color-text-strong)]">
        {value}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt
        className={cn(
          "text-[12px]",
          emphasize
            ? "font-semibold text-[var(--color-text-strong)]"
            : "text-[var(--color-text-soft)]",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "tabular-nums",
          emphasize
            ? "text-[20px] font-semibold text-[var(--color-text-strong)]"
            : "text-[13px] text-[var(--color-text-sub)]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
