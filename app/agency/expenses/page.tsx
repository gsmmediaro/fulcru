import { RiReceiptLine } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { getApi } from "@/lib/agency/server-api";
import { getT } from "@/lib/i18n/server";
import { ExpensesView } from "@/components/agency/expenses-view";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t } = await getT();
  const api = await getApi();
  const sp = await searchParams;

  function sp1(key: string): string | null {
    const v = sp[key];
    return Array.isArray(v) ? (v[0] ?? null) : v ?? null;
  }

  const [expenses, projects, settings] = await Promise.all([
    api.listExpenses(),
    api.listProjects(),
    api.getSettings(),
  ]);

  const initialDatePreset = sp1("date") ?? "allTime";
  const initialProjectIds = (sp1("project") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const initialCategories = (sp1("category") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const initialBillable = sp1("billable") ?? "all";
  const initialInvoiced = sp1("invoiced") ?? "all";

  return (
    <AppShell>
      <ExpensesView
        expenses={expenses}
        projects={projects}
        defaultCurrency={settings.businessCurrency}
        initialDatePreset={initialDatePreset}
        initialProjectIds={initialProjectIds}
        initialCategories={initialCategories}
        initialBillable={initialBillable}
        initialInvoiced={initialInvoiced}
        pageTitle={t("expenses.title")}
        pageSubtitle={t("expenses.subtitle")}
        emptyTitle={t("expenses.empty.title")}
        emptyBody={t("expenses.empty.body")}
        newExpenseLabel={t("expenses.new")}
      />
    </AppShell>
  );
}
