import Link from "next/link";
import { RiBillLine } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { ClientAvatar } from "@/components/agency/client-avatar";
import { InvoiceStatusPill } from "@/components/agency/invoice-status-pill";
import { NewInvoiceButton } from "@/components/agency/new-invoice-modal";
import { getApi } from "@/lib/agency/server-api";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/cn";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const DAY = 24 * 60 * 60 * 1000;

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toISOString().slice(0, 10);
}

export default async function InvoicesPage() {
  const { t } = await getT();
  const api = await getApi();
  const [invoicesRaw, clients] = await Promise.all([
    api.listInvoices(),
    api.listClients(),
  ]);
  const invoices = invoicesRaw
    .slice()
    .sort((a, b) =>
      (b.issuedAt ?? b.periodEnd).localeCompare(a.issuedAt ?? a.periodEnd),
    );
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + i.totalUsd, 0);

  const cutoff = Date.now() - 30 * DAY;
  const paid30 = invoices
    .filter(
      (i) =>
        i.status === "paid" &&
        i.paidAt &&
        new Date(i.paidAt).getTime() >= cutoff,
    )
    .reduce((s, i) => s + i.totalUsd, 0);

  const overdue = invoices.filter((i) => i.status === "overdue").length;

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <div className="flex items-center gap-[14px]">
          <span className="flex size-[44px] shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-400)]">
            <RiBillLine size={20} />
          </span>
          <div className="flex flex-col">
            <h1 className="text-[26px] font-semibold leading-[32px] tracking-tight sm:text-[28px] sm:leading-[34px]">
              {t("invoices.title")}
            </h1>
            <p className="mt-[2px] text-[13px] leading-[18px] text-[var(--color-text-soft)]">
              {t("invoices.subtitle")}
            </p>
          </div>
        </div>
        <NewInvoiceButton clients={clients} />
      </div>

      <div className="mt-[24px] grid grid-cols-1 gap-[12px] sm:grid-cols-3">
        <Stat label={t("invoices.outstanding")} value={usd.format(outstanding)} />
        <Stat label={t("invoices.paid30")} value={usd.format(paid30)} accent="green" />
        <Stat
          label={t("invoices.overdue")}
          value={`${overdue}`}
          accent={overdue > 0 ? "rose" : undefined}
        />
      </div>

      <section className="mt-[20px] rounded-[8px] bg-[var(--color-bg-surface)] p-[16px] ring-1 ring-[var(--color-stroke-soft)] sm:p-[20px]">
        <header className="mb-[12px]">
          <h2 className="tp-overline text-[var(--color-brand-400)]">
            {t("invoices.all")}
          </h2>
        </header>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
                <Th>{t("invoices.col.number")}</Th>
                <Th>{t("invoices.col.client")}</Th>
                <Th>{t("invoices.col.period")}</Th>
                <Th>{t("invoices.col.issued")}</Th>
                <Th>{t("invoices.col.due")}</Th>
                <Th>{t("invoices.col.status")}</Th>
                <th className="px-[12px] pb-[10px] text-right font-semibold">
                  {t("invoices.col.total")}
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const c = clientMap.get(inv.clientId);
                return (
                  <tr
                    key={inv.id}
                    className={cn(
                      "border-t border-[var(--color-stroke-soft)] transition-colors",
                      "hover:bg-[color-mix(in_oklab,white_2%,transparent)]",
                    )}
                  >
                    <Td className="font-semibold text-[var(--color-text-strong)]">
                      <Link
                        href={`/agency/invoices/${inv.id}`}
                        className="hover:text-[var(--color-brand-400)]"
                      >
                        {inv.number}
                      </Link>
                    </Td>
                    <Td>
                      {c ? (
                        <span className="flex items-center gap-[8px]">
                          <ClientAvatar
                            initials={c.initials}
                            accentColor={c.accentColor}
                            size={26}
                          />
                          <span className="text-[var(--color-text-strong)]">
                            {c.name}
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="text-[12px] tabular-nums">
                      {fmtDate(inv.periodStart)} → {fmtDate(inv.periodEnd)}
                    </Td>
                    <Td className="tabular-nums">{fmtDate(inv.issuedAt)}</Td>
                    <Td className="tabular-nums">{fmtDate(inv.dueAt)}</Td>
                    <Td>
                      <InvoiceStatusPill status={inv.status} />
                    </Td>
                    <td className="whitespace-nowrap px-[12px] py-[14px] text-right font-semibold tabular-nums text-[var(--color-text-strong)]">
                      {usd.format(inv.totalUsd)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "rose";
}) {
  return (
    <div className="rounded-[8px] bg-[var(--color-bg-surface)] p-[16px] ring-1 ring-[var(--color-stroke-soft)]">
      <div className="text-[11px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-[6px] text-[24px] font-semibold tabular-nums",
          accent === "green" && "text-emerald-300",
          accent === "rose" && "text-rose-300",
          !accent && "text-[var(--color-text-strong)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-[12px] pb-[10px] font-semibold">
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-[12px] py-[14px] text-[var(--color-text-sub)]",
        className,
      )}
    >
      {children}
    </td>
  );
}
