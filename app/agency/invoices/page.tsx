import { RiSettings4Line } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { NewInvoiceButton } from "@/components/agency/new-invoice-modal";
import { InvoicesTable } from "@/components/agency/invoices-table";
import { getApi } from "@/lib/agency/server-api";
import { getT } from "@/lib/i18n/server";
import { CompactButton } from "@/components/ui/compact-button";
import type { InvoiceStatus } from "@/lib/agency/types";
import type { InvoicesTableProps } from "@/components/agency/invoices-table";

type SortKey = InvoicesTableProps["initialSort"];
type SortDir = InvoicesTableProps["initialDir"];

const VALID_SORT_KEYS: SortKey[] = [
  "number",
  "client",
  "issueDate",
  "dueOn",
  "amount",
  "balance",
  "status",
];

const VALID_STATUSES: InvoiceStatus[] = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "void",
];

function parseSort(raw: string | null): SortKey {
  const v = raw ?? "";
  return (VALID_SORT_KEYS.includes(v as SortKey) ? v : "issueDate") as SortKey;
}

function parseDir(raw: string | null): SortDir {
  return raw === "asc" ? "asc" : "desc";
}

function parseStatuses(raw: string | null): InvoiceStatus[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is InvoiceStatus => VALID_STATUSES.includes(s as InvoiceStatus));
}

function parseClientIds(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t } = await getT();
  const api = await getApi();
  const [invoicesRaw, clients] = await Promise.all([
    api.listInvoices(),
    api.listClients(),
  ]);

  const sp = await searchParams;

  function sp1(key: string): string | null {
    const v = sp[key];
    return Array.isArray(v) ? (v[0] ?? null) : v ?? null;
  }

  const sort = parseSort(sp1("sort"));
  const dir = parseDir(sp1("dir"));
  const initialStatus = parseStatuses(sp1("status"));
  const initialClientIds = parseClientIds(sp1("client"));
  const initialDatePreset = sp1("date") ?? "allTime";
  const initialQ = sp1("q") ?? "";
  const initialAmountMin = sp1("amountMin") ?? "";
  const initialAmountMax = sp1("amountMax") ?? "";
  const initialBalanceMin = sp1("balanceMin") ?? "";
  const initialBalanceMax = sp1("balanceMax") ?? "";

  return (
    <AppShell>
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <h1 className="text-[26px] font-semibold leading-[32px] tracking-tight text-[var(--color-text-strong)] sm:text-[28px] sm:leading-[34px]">
          {t("invoices.title")}
        </h1>
        <div className="flex items-center gap-[8px]">
          <CompactButton aria-label={t("invoiceList.settings")} variant="neutral" size="sm">
            <RiSettings4Line size={16} />
          </CompactButton>
          <NewInvoiceButton clients={clients} />
        </div>
      </div>

      {/* Filter bar + Table */}
      <div className="mt-[20px]">
        <InvoicesTable
          invoices={invoicesRaw}
          clients={clients}
          initialSort={sort}
          initialDir={dir}
          initialStatus={initialStatus}
          initialClientIds={initialClientIds}
          initialDatePreset={initialDatePreset}
          initialQ={initialQ}
          initialAmountMin={initialAmountMin}
          initialAmountMax={initialAmountMax}
          initialBalanceMin={initialBalanceMin}
          initialBalanceMax={initialBalanceMax}
        />
      </div>
    </AppShell>
  );
}
