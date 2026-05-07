"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RiCheckLine, RiPrinterLine, RiSendPlaneLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/provider";
import type { InvoiceStatus } from "@/lib/agency/types";

export function InvoiceActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [busy, setBusy] = React.useState<"issue" | "pay" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function call(action: "issue" | "pay") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/agency/invoices/${invoiceId}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-[8px] print:hidden">
      <Button
        type="button"
        variant="ghost"
        leadingIcon={<RiPrinterLine size={16} />}
        onClick={() => window.print()}
      >
        {t("invoice.print")}
      </Button>
      {status === "draft" ? (
        <Button
          type="button"
          variant="outline"
          leadingIcon={<RiSendPlaneLine size={16} />}
          onClick={() => call("issue")}
          disabled={busy !== null}
        >
          {busy === "issue" ? t("modal.creating") : t("invoice.issue")}
        </Button>
      ) : null}
      {status !== "paid" ? (
        <Button
          type="button"
          variant="primary-orange"
          leadingIcon={<RiCheckLine size={16} />}
          onClick={() => call("pay")}
          disabled={busy !== null}
        >
          {busy === "pay" ? t("modal.creating") : t("invoice.markPaid")}
        </Button>
      ) : null}
      {error ? (
        <span className="text-[12px] text-rose-300">{error}</span>
      ) : null}
    </div>
  );
}
