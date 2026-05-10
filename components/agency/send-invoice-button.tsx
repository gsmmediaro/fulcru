"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RiSendPlane2Line } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/provider";

type Props = {
  clientId: string;
  hasUninvoicedWork: boolean;
};

// Creates a draft invoice for this client from all uninvoiced shipped runs
// in the last 365 days, then jumps the user to the invoice editor where
// they can review line items and click Issue/Send.
export function SendInvoiceButton({ clientId, hasUninvoicedWork }: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onClick() {
    if (pending || !hasUninvoicedWork) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/agency/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId, windowDays: 365 }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const created = (await res.json()) as { id: string };
      router.push(`/agency/invoices/${created.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }

  return (
    <div className="relative">
      <Button
        variant="primary-orange"
        size="md"
        leadingIcon={<RiSendPlane2Line size={14} />}
        onClick={onClick}
        disabled={pending || !hasUninvoicedWork}
        title={
          !hasUninvoicedWork
            ? t("clients.sendInvoice.nothingToBill")
            : undefined
        }
      >
        {pending ? t("clients.sendInvoice.creating") : t("clients.sendInvoice.label")}
      </Button>
      {error ? (
        <div className="absolute right-0 top-[calc(100%+6px)] z-10 max-w-[280px] rounded-[6px] bg-rose-500/10 px-[10px] py-[6px] text-[11px] text-rose-300 ring-1 ring-rose-400/30">
          {error}
        </div>
      ) : null}
    </div>
  );
}
