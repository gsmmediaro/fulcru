import Link from "next/link";
import { notFound } from "next/navigation";
import { RiArrowLeftLine } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { InvoiceStatusPill } from "@/components/agency/invoice-status-pill";
import { InvoiceActions } from "@/components/agency/invoice-actions";
import { getApi } from "@/lib/agency/server-api";
import { getT } from "@/lib/i18n/server";
import { type Locale } from "@/lib/i18n/dict";
import { cn } from "@/lib/cn";

function moneyFor(locale: Locale) {
  return new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function dateFor(locale: Locale) {
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  const fmt = new Intl.DateTimeFormat(
    locale === "ro" ? "ro-RO" : "en-US",
    opts,
  );
  return (iso?: string) => (iso ? fmt.format(new Date(iso)) : "—");
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await getApi();
  const invoice = await api.getInvoice(id);
  if (!invoice) notFound();

  const { t, locale } = await getT();
  const money = moneyFor(locale);
  const fmtDate = dateFor(locale);

  const client = await api.getClient(invoice.clientId);

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-[12px] print:hidden">
        <Link
          href="/agency/invoices"
          className="inline-flex items-center gap-[6px] text-[12px] font-semibold text-[var(--color-text-soft)] hover:text-[var(--color-text-strong)]"
        >
          <RiArrowLeftLine size={14} /> {t("invoice.back")}
        </Link>
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
      </div>

      <article
        className={cn(
          "invoice-doc enter-stagger mt-[16px] rounded-[8px]",
          "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
          "p-[28px] sm:p-[40px]",
        )}
      >
        <header className="flex flex-wrap items-start justify-between gap-[16px] border-b border-[var(--color-stroke-soft)] pb-[20px]">
          <div className="flex flex-col gap-[6px]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-400)]">
              {t("invoice.title")}
            </span>
            <div className="flex items-center gap-[12px]">
              <h1 className="text-[28px] font-semibold leading-[34px] tracking-tight text-[var(--color-text-strong)] sm:text-[32px] sm:leading-[40px]">
                {invoice.number}
              </h1>
              <InvoiceStatusPill status={invoice.status} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-[24px] gap-y-[4px] text-[12px] tabular-nums sm:text-[13px]">
            <DocRow
              label={t("invoice.issuedAt")}
              value={fmtDate(invoice.issuedAt)}
            />
            <DocRow label={t("invoice.dueAt")} value={fmtDate(invoice.dueAt)} />
            <DocRow
              label={t("invoice.period")}
              value={`${fmtDate(invoice.periodStart)} → ${fmtDate(invoice.periodEnd)}`}
              span={2}
            />
            {invoice.paidAt ? (
              <DocRow
                label={t("invoice.paidAt")}
                value={fmtDate(invoice.paidAt)}
                span={2}
              />
            ) : null}
          </dl>
        </header>

        <div className="mt-[24px] grid grid-cols-1 gap-[20px] sm:grid-cols-2">
          <Party title={t("invoice.from")}>
            <span className="text-[var(--color-text-soft)]">
              {t("invoice.fromEmpty")}
            </span>
          </Party>
          <Party title={t("invoice.to")}>
            {client ? (
              <div className="font-semibold text-[var(--color-text-strong)]">
                {client.name}
              </div>
            ) : (
              <span className="text-[var(--color-text-soft)]">—</span>
            )}
          </Party>
        </div>

        <section className="mt-[28px]">
          <header className="mb-[10px] flex items-center justify-between">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand-400)]">
              {t("invoice.lineItems")}
            </h2>
            <span className="text-[11px] tabular-nums text-[var(--color-text-soft)]">
              {invoice.lineItems.length}
            </span>
          </header>
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
                  <th className="px-[12px] pb-[10px] font-semibold w-[44px]">
                    {t("invoice.col.no")}
                  </th>
                  <th className="px-[12px] pb-[10px] font-semibold">
                    {t("invoice.col.skill")}
                  </th>
                  <th className="px-[12px] pb-[10px] font-semibold">
                    {t("invoice.col.description")}
                  </th>
                  <th className="px-[12px] pb-[10px] text-right font-semibold">
                    {t("invoice.col.hours")}
                  </th>
                  <th className="px-[12px] pb-[10px] text-right font-semibold">
                    {t("invoice.col.rate")}
                  </th>
                  <th className="px-[12px] pb-[10px] text-right font-semibold">
                    {t("invoice.col.amount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((li, i) => (
                  <tr
                    key={li.runId ?? `row-${i}`}
                    className="border-t border-[var(--color-stroke-soft)]"
                  >
                    <td className="px-[12px] py-[14px] tabular-nums text-[var(--color-text-soft)]">
                      {i + 1}
                    </td>
                    <td className="px-[12px] py-[14px] font-semibold text-[var(--color-text-strong)]">
                      {li.skillName ?? li.type}
                    </td>
                    <td className="px-[12px] py-[14px] text-[var(--color-text-soft)]">
                      {li.description}
                    </td>
                    <td className="px-[12px] py-[14px] text-right tabular-nums text-[var(--color-text-sub)]">
                      {li.quantity.toFixed(2)}
                    </td>
                    <td className="px-[12px] py-[14px] text-right tabular-nums text-[var(--color-text-sub)]">
                      {money.format(li.unitPrice)}
                    </td>
                    <td className="px-[12px] py-[14px] text-right font-semibold tabular-nums text-[var(--color-text-strong)]">
                      {money.format(li.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-[20px] flex justify-end">
            <dl className="w-full max-w-[340px] rounded-[6px] bg-[color-mix(in_oklab,white_2%,transparent)] p-[16px] ring-1 ring-[var(--color-stroke-soft)]">
              <Row
                label={t("invoice.subtotal")}
                value={money.format(invoice.subtotalUsd)}
              />
              <Row
                label={t("invoice.tax")}
                value={money.format(invoice.taxUsd)}
              />
              <div className="my-[8px] border-t border-[var(--color-stroke-soft)]" />
              <Row
                label={t("invoice.total")}
                value={money.format(invoice.totalUsd)}
                emphasize
              />
            </dl>
          </div>
        </section>

        <footer className="mt-[28px] border-t border-[var(--color-stroke-soft)] pt-[16px]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand-400)]">
            {t("invoice.paymentTerms")}
          </div>
          <p className="mt-[8px] text-[12px] leading-[18px] text-[var(--color-text-sub)]">
            {t("invoice.paymentBody")}
          </p>
        </footer>
      </article>
    </AppShell>
  );
}

function Party({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[6px] bg-[color-mix(in_oklab,white_2%,transparent)] p-[16px] ring-1 ring-[var(--color-stroke-soft)]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand-400)]">
        {title}
      </h3>
      <div className="mt-[8px] flex flex-col gap-[3px] text-[12px] sm:text-[13px]">
        {children}
      </div>
    </section>
  );
}

function DocRow({
  label,
  value,
  span = 1,
}: {
  label: string;
  value: string;
  span?: 1 | 2;
}) {
  return (
    <div className={cn("flex flex-col", span === 2 && "col-span-2")}>
      <dt className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
        {label}
      </dt>
      <dd className="font-semibold text-[var(--color-text-strong)]">{value}</dd>
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
