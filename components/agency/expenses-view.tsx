"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  RiReceiptLine,
  RiExternalLinkLine,
  RiMoreFill,
  RiDeleteBinLine,
  RiCheckLine,
  RiCloseCircleLine,
} from "@remixicon/react";
import { KpiCard } from "@/components/agency/kpi-card";
import { EmptyState } from "@/components/agency/empty-state";
import { NewExpenseButton } from "@/components/agency/new-expense-modal";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import type { Expense, ExpenseCategory, Project } from "@/lib/agency/types";

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "ai_tools",
  "software",
  "hosting",
  "domain",
  "hardware",
  "travel",
  "food",
  "marketing",
  "education",
  "other",
];

const CAT_COLORS: Record<ExpenseCategory, string> = {
  ai_tools:
    "bg-violet-500/15 text-violet-300 ring-violet-500/25",
  software:
    "bg-blue-500/15 text-blue-300 ring-blue-500/25",
  hosting:
    "bg-sky-500/15 text-sky-300 ring-sky-500/25",
  domain:
    "bg-cyan-500/15 text-cyan-300 ring-cyan-500/25",
  hardware:
    "bg-slate-500/15 text-slate-300 ring-slate-500/25",
  travel:
    "bg-amber-500/15 text-amber-300 ring-amber-500/25",
  food:
    "bg-orange-500/15 text-orange-300 ring-orange-500/25",
  marketing:
    "bg-pink-500/15 text-pink-300 ring-pink-500/25",
  education:
    "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
  other:
    "bg-zinc-500/15 text-zinc-300 ring-zinc-500/25",
};

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function datePresetRange(preset: string): { from?: string; to?: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  if (preset === "thisMonth") {
    const from = `${y}-${pad(m + 1)}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const to = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
    return { from, to };
  }
  if (preset === "lastMonth") {
    const lastM = m === 0 ? 11 : m - 1;
    const lastY = m === 0 ? y - 1 : y;
    const from = `${lastY}-${pad(lastM + 1)}-01`;
    const lastDay = new Date(lastY, lastM + 1, 0).getDate();
    const to = `${lastY}-${pad(lastM + 1)}-${pad(lastDay)}`;
    return { from, to };
  }
  if (preset === "thisYear") {
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  if (preset === "lastYear") {
    return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
  }
  return {};
}

function filterExpenses(
  expenses: Expense[],
  opts: {
    datePreset: string;
    projectIds: string[];
    categories: string[];
    billable: string;
    invoiced: string;
  },
) {
  const { from, to } = datePresetRange(opts.datePreset);
  return expenses.filter((e) => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    if (opts.projectIds.length > 0 && !opts.projectIds.includes(e.projectId ?? "")) return false;
    if (opts.categories.length > 0 && !opts.categories.includes(e.category)) return false;
    if (opts.billable === "yes" && !e.billable) return false;
    if (opts.billable === "no" && e.billable) return false;
    if (opts.invoiced === "yes" && !e.invoiceId) return false;
    if (opts.invoiced === "no" && e.invoiceId) return false;
    return true;
  });
}

function CategoryPill({ category }: { category: ExpenseCategory }) {
  const { t } = useLocale();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-[8px] py-[2px]",
        "text-[11px] font-semibold ring-1",
        CAT_COLORS[category],
      )}
    >
      {t(`expense.cat.${category}`)}
    </span>
  );
}

type ViewProps = {
  expenses: Expense[];
  projects: Project[];
  defaultCurrency: string;
  initialDatePreset: string;
  initialProjectIds: string[];
  initialCategories: string[];
  initialBillable: string;
  initialInvoiced: string;
  pageTitle: string;
  pageSubtitle: string;
  emptyTitle: string;
  emptyBody: string;
  newExpenseLabel: string;
};

export function ExpensesView({
  expenses: initialExpenses,
  projects,
  defaultCurrency,
  initialDatePreset,
  initialProjectIds,
  initialCategories,
  initialBillable,
  initialInvoiced,
  pageTitle,
  pageSubtitle,
  emptyTitle,
  emptyBody,
}: ViewProps) {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [expenses, setExpenses] = React.useState<Expense[]>(initialExpenses);
  const [datePreset, setDatePreset] = React.useState(initialDatePreset);
  const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>(initialProjectIds);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(initialCategories);
  const [billableFilter, setBillableFilter] = React.useState(initialBillable);
  const [invoicedFilter, setInvoicedFilter] = React.useState(initialInvoiced);

  const projectMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) m.set(p.id, p.name);
    return m;
  }, [projects]);

  // Sync URL params
  React.useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    if (datePreset && datePreset !== "allTime") p.set("date", datePreset);
    else p.delete("date");
    if (selectedProjectIds.length > 0) p.set("project", selectedProjectIds.join(","));
    else p.delete("project");
    if (selectedCategories.length > 0) p.set("category", selectedCategories.join(","));
    else p.delete("category");
    if (billableFilter !== "all") p.set("billable", billableFilter);
    else p.delete("billable");
    if (invoicedFilter !== "all") p.set("invoiced", invoicedFilter);
    else p.delete("invoiced");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }, [datePreset, selectedProjectIds, selectedCategories, billableFilter, invoicedFilter, pathname, router, searchParams]);

  const filtered = React.useMemo(
    () =>
      filterExpenses(expenses, {
        datePreset,
        projectIds: selectedProjectIds,
        categories: selectedCategories,
        billable: billableFilter,
        invoiced: invoicedFilter,
      }),
    [expenses, datePreset, selectedProjectIds, selectedCategories, billableFilter, invoicedFilter],
  );

  // KPI: this month totals (always, regardless of filter)
  const now = new Date();
  const thisMonthFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const thisMonth = expenses.filter((e) => e.date >= thisMonthFrom);
  const kpiTotal = thisMonth.reduce((s, e) => s + e.amount, 0);
  const kpiBillable = thisMonth.filter((e) => e.billable).reduce((s, e) => s + e.amount, 0);
  const kpiNonBillable = thisMonth.filter((e) => !e.billable).reduce((s, e) => s + e.amount, 0);

  async function deleteExpense(id: string) {
    await fetch(`/api/agency/expenses/${id}`, { method: "DELETE" });
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function toggleProjectId(id: string) {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat],
    );
  }

  return (
    <>
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-[16px]">
        <div>
          <h1 className="text-[26px] font-semibold leading-[32px] tracking-tight text-[var(--color-text-strong)] sm:text-[28px] sm:leading-[34px]">
            {pageTitle}
          </h1>
          <p className="mt-[4px] text-[13px] text-[var(--color-text-soft)]">
            {pageSubtitle}
          </p>
        </div>
        <NewExpenseButton
          projects={projects}
          defaultCurrency={defaultCurrency}
          onCreated={(exp) => setExpenses((prev) => [exp, ...prev])}
        />
      </div>

      {/* KPI strip */}
      <div className="mt-[20px] grid grid-cols-1 gap-[12px] sm:grid-cols-3">
        <KpiCard
          label={t("expenses.kpi.thisMonth")}
          value={fmt(kpiTotal, defaultCurrency)}
          hint={`${thisMonth.length} items`}
        />
        <KpiCard
          label={t("expenses.kpi.billable")}
          value={fmt(kpiBillable, defaultCurrency)}
          deltaTone="positive"
        />
        <KpiCard
          label={t("expenses.kpi.nonBillable")}
          value={fmt(kpiNonBillable, defaultCurrency)}
          deltaTone="neutral"
        />
      </div>

      {/* Filter bar */}
      <div className="mt-[16px] flex flex-wrap items-center gap-[8px]">
        {/* Date preset */}
        <Select value={datePreset} onValueChange={setDatePreset}>
          <SelectTrigger className="h-[32px] w-auto min-w-[130px] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="allTime">{t("expenses.filter.allTime")}</SelectItem>
            <SelectItem value="thisMonth">{t("expenses.filter.thisMonth")}</SelectItem>
            <SelectItem value="lastMonth">{t("expenses.filter.lastMonth")}</SelectItem>
            <SelectItem value="thisYear">{t("expenses.filter.thisYear")}</SelectItem>
            <SelectItem value="lastYear">{t("expenses.filter.lastYear")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Project multi-select (simple pills) */}
        {projects.length > 0 && (
          <div className="flex flex-wrap gap-[4px]">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleProjectId(p.id)}
                className={cn(
                  "rounded-full px-[10px] py-[4px] text-[11px] font-semibold ring-1 transition-colors duration-150",
                  selectedProjectIds.includes(p.id)
                    ? "bg-[var(--color-brand-400)] text-white ring-[var(--color-brand-400)]"
                    : "bg-[var(--color-bg-tint-4)] text-[var(--color-text-soft)] ring-[var(--color-stroke-soft)] hover:ring-[var(--color-stroke-sub)]",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Category multi-select pills */}
        <div className="flex flex-wrap gap-[4px]">
          {EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={cn(
                "rounded-full px-[10px] py-[4px] text-[11px] font-semibold ring-1 transition-colors duration-150",
                selectedCategories.includes(cat)
                  ? cn("ring-1", CAT_COLORS[cat])
                  : "bg-[var(--color-bg-tint-4)] text-[var(--color-text-soft)] ring-[var(--color-stroke-soft)] hover:ring-[var(--color-stroke-sub)]",
              )}
            >
              {t(`expense.cat.${cat}`)}
            </button>
          ))}
        </div>

        {/* Billable filter */}
        <Select value={billableFilter} onValueChange={setBillableFilter}>
          <SelectTrigger className="h-[32px] w-auto min-w-[110px] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{`${t("expenses.filter.billable")}: ${t("expenses.filter.billableAll")}`}</SelectItem>
            <SelectItem value="yes">{`${t("expenses.filter.billable")}: ${t("expenses.filter.billableYes")}`}</SelectItem>
            <SelectItem value="no">{`${t("expenses.filter.billable")}: ${t("expenses.filter.billableNo")}`}</SelectItem>
          </SelectContent>
        </Select>

        {/* Invoiced filter */}
        <Select value={invoicedFilter} onValueChange={setInvoicedFilter}>
          <SelectTrigger className="h-[32px] w-auto min-w-[110px] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{`${t("expenses.filter.invoiced")}: ${t("expenses.filter.invoicedAll")}`}</SelectItem>
            <SelectItem value="yes">{`${t("expenses.filter.invoiced")}: ${t("expenses.filter.invoicedYes")}`}</SelectItem>
            <SelectItem value="no">{`${t("expenses.filter.invoiced")}: ${t("expenses.filter.invoicedNo")}`}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table / Empty state */}
      <div className="mt-[16px]">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<RiReceiptLine size={22} />}
            title={emptyTitle}
            description={emptyBody}
            action={
              <NewExpenseButton
                projects={projects}
                defaultCurrency={defaultCurrency}
                onCreated={(exp) => setExpenses((prev) => [exp, ...prev])}
              />
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-[8px] ring-1 ring-[var(--color-stroke-soft)]">
            <table className="w-full min-w-[700px] text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-stroke-soft)] bg-[var(--color-bg-surface)]">
                  {[
                    t("expenses.col.date"),
                    t("expenses.col.description"),
                    t("expenses.col.project"),
                    t("expenses.col.amount"),
                    t("expenses.col.billable"),
                    t("expenses.col.receipt"),
                    "",
                  ].map((col, i) => (
                    <th
                      key={i}
                      className={cn(
                        "px-[14px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-soft)]",
                        i === 3 && "text-right",
                        i === 4 && "text-center",
                        i === 5 && "text-center",
                      )}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense) => (
                  <tr
                    key={expense.id}
                    className="group border-b border-[var(--color-stroke-soft)] last:border-0 hover:bg-[var(--color-bg-tint-2)] transition-colors duration-100"
                  >
                    {/* Date */}
                    <td className="whitespace-nowrap px-[14px] py-[12px] font-mono text-[12px] tabular-nums text-[var(--color-text-sub)]">
                      {expense.date}
                    </td>
                    {/* Description: note + category pill */}
                    <td className="px-[14px] py-[12px]">
                      <div className="flex flex-col gap-[4px]">
                        {expense.note ? (
                          <span className="text-[13px] text-[var(--color-text-strong)] line-clamp-1">
                            {expense.note}
                          </span>
                        ) : null}
                        <CategoryPill category={expense.category} />
                      </div>
                    </td>
                    {/* Project */}
                    <td className="px-[14px] py-[12px] text-[var(--color-text-sub)]">
                      {expense.projectId
                        ? projectMap.get(expense.projectId) ?? "-"
                        : "-"}
                    </td>
                    {/* Amount */}
                    <td className="px-[14px] py-[12px] text-right font-semibold tabular-nums text-[var(--color-text-strong)]">
                      {fmt(expense.amount, expense.currency)}
                    </td>
                    {/* Billable */}
                    <td className="px-[14px] py-[12px] text-center">
                      {expense.billable ? (
                        <RiCheckLine
                          size={15}
                          className="mx-auto text-emerald-400"
                        />
                      ) : (
                        <RiCloseCircleLine
                          size={15}
                          className="mx-auto text-[var(--color-text-soft)]"
                        />
                      )}
                    </td>
                    {/* Receipt */}
                    <td className="px-[14px] py-[12px] text-center">
                      {expense.receiptUrl ? (
                        <a
                          href={expense.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t("expenses.action.viewReceipt")}
                          className="inline-flex items-center justify-center text-[var(--color-brand-400)] hover:text-[var(--color-text-strong)]"
                        >
                          <RiExternalLinkLine size={14} />
                        </a>
                      ) : (
                        <span className="text-[var(--color-text-soft)]">-</span>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-[10px] py-[12px]">
                      <Dropdown>
                        <DropdownTrigger asChild>
                          <button
                            type="button"
                            aria-label="Row actions"
                            className={cn(
                              "flex h-[28px] w-[28px] items-center justify-center rounded-[4px]",
                              "text-[var(--color-text-soft)] opacity-0 group-hover:opacity-100",
                              "hover:bg-[var(--color-bg-tint-6)] hover:text-[var(--color-text-strong)]",
                              "transition-[opacity,background-color,color] duration-150",
                            )}
                          >
                            <RiMoreFill size={15} />
                          </button>
                        </DropdownTrigger>
                        <DropdownContent align="end">
                          {expense.receiptUrl && (
                            <DropdownItem
                              onSelect={() =>
                                window.open(expense.receiptUrl!, "_blank")
                              }
                            >
                              <RiExternalLinkLine size={14} />
                              {t("expenses.action.viewReceipt")}
                            </DropdownItem>
                          )}
                          <DropdownItem
                            onSelect={() => deleteExpense(expense.id)}
                            className="text-rose-300 data-[highlighted]:text-rose-200"
                          >
                            <RiDeleteBinLine size={14} />
                            {t("expenses.action.delete")}
                          </DropdownItem>
                        </DropdownContent>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
