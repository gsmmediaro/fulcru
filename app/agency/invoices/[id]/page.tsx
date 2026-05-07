import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { InvoiceEditor } from "@/components/agency/invoice-editor";
import { getApi } from "@/lib/agency/server-api";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await getApi();
  const invoice = await api.getInvoice(id);
  if (!invoice) notFound();

  const [client, billableExpenses] = await Promise.all([
    api.getClient(invoice.clientId),
    api.listExpenses({
      clientId: invoice.clientId,
      billable: true,
      invoiceId: null,
    }),
  ]);

  return (
    <AppShell>
      <InvoiceEditor
        invoice={invoice}
        client={client}
        billableExpenses={billableExpenses}
      />
    </AppShell>
  );
}
