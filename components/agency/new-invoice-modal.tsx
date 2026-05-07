"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RiAddLine } from "@remixicon/react";
import { Modal, ModalCloseButton } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, Input } from "@/components/agency/new-client-modal";
import { useLocale } from "@/lib/i18n/provider";
import type { Client } from "@/lib/agency/types";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

type EligibleRun = {
  id: string;
  skillId: string;
  baselineHours: number;
  rateUsd: number;
  billableUsd: number;
  startedAt: string;
};

export function NewInvoiceButton({ clients }: { clients: Client[] }) {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="primary-orange"
        leadingIcon={<RiAddLine size={16} />}
        onClick={() => setOpen(true)}
      >
        {t("invoiceList.createInvoice")}
      </Button>
      <NewInvoiceModal
        open={open}
        onOpenChange={setOpen}
        clients={clients}
      />
    </>
  );
}

function NewInvoiceModal({
  open,
  onOpenChange,
  clients,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  clients: Client[];
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [clientId, setClientId] = React.useState(clients[0]?.id ?? "");
  const [windowDays, setWindowDays] = React.useState("30");
  const [taxPct, setTaxPct] = React.useState("0");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [eligible, setEligible] = React.useState<EligibleRun[] | null>(null);
  const [invoicedRunIds, setInvoicedRunIds] = React.useState<Set<string>>(
    new Set(),
  );

  React.useEffect(() => {
    if (!open) {
      setClientId(clients[0]?.id ?? "");
      setWindowDays("30");
      setTaxPct("0");
      setError(null);
      setSubmitting(false);
    }
  }, [open, clients]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const allInvoices = await fetch("/api/agency/invoices", {
        cache: "no-store",
      }).then((r) => r.json());
      const used = new Set<string>();
      for (const inv of allInvoices as Array<{
        lineItems: Array<{ runId: string }>;
      }>) {
        for (const li of inv.lineItems) used.add(li.runId);
      }
      if (!cancelled) setInvoicedRunIds(used);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open || !clientId) {
      setEligible(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const runs = (await fetch(
        `/api/agency/runs?clientId=${clientId}&status=shipped&limit=200`,
        { cache: "no-store" },
      ).then((r) => r.json())) as EligibleRun[];
      if (cancelled) return;
      const win = Math.max(1, Number(windowDays) || 30);
      const cutoff = Date.now() - win * 24 * 3600_000;
      setEligible(
        runs.filter(
          (r) =>
            new Date(r.startedAt).getTime() >= cutoff &&
            !invoicedRunIds.has(r.id),
        ),
      );
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, clientId, windowDays, invoicedRunIds]);

  const subtotal =
    eligible?.reduce((s, r) => s + (r.billableUsd ?? 0), 0) ?? 0;
  const taxValue = (subtotal * (Number(taxPct) || 0)) / 100;
  const total = subtotal + taxValue;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/agency/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId,
          windowDays: Number(windowDays),
          taxPct: Number(taxPct) || 0,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      const created = (await res.json()) as { id: string };
      onOpenChange(false);
      router.push(`/agency/invoices/${created.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel="Create a new invoice"
      width={560}
    >
      <ModalCloseButton onClick={() => onOpenChange(false)} />
      <form onSubmit={onSubmit} className="flex flex-col">
        <header className="flex flex-col gap-[4px] px-[24px] pb-[16px] pt-[24px]">
          <h2 className="text-[20px] font-semibold leading-[26px] tracking-tight text-[var(--color-text-strong)]">
            {t("newInvoice.title")}
          </h2>
          <p className="text-[13px] text-[var(--color-text-soft)]">
            {t("newInvoice.subtitle")}
          </p>
        </header>

        <div className="flex flex-col gap-[16px] px-[24px] pb-[8px]">
          <Field label={t("newInvoice.client")}>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger
                aria-label={t("newInvoice.client")}
                className="text-[14px] font-normal normal-case tracking-normal"
              >
                <SelectValue placeholder={t("newInvoice.clientPh")} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-[12px]">
            <Field label={t("newInvoice.window")} htmlFor="iv-window">
              <Input
                id="iv-window"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={windowDays}
                onChange={(e) => setWindowDays(e.target.value)}
                required
              />
            </Field>
            <Field label={t("newInvoice.tax")} htmlFor="iv-tax">
              <Input
                id="iv-tax"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.5}
                value={taxPct}
                onChange={(e) => setTaxPct(e.target.value)}
              />
            </Field>
          </div>

          <div className="rounded-[6px] bg-[color-mix(in_oklab,white_3%,transparent)] px-[14px] py-[12px] ring-1 ring-[var(--color-stroke-soft)]">
            <div className="flex items-center justify-between text-[12px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
              <span>{t("newInvoice.eligible")}</span>
              <span className="tabular-nums">
                {eligible === null ? "—" : eligible.length}
              </span>
            </div>
            <div className="mt-[8px] flex items-baseline justify-between">
              <span className="text-[12px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
                {t("newInvoice.subtotal")}
              </span>
              <span className="text-[18px] font-semibold tabular-nums text-[var(--color-text-strong)]">
                {usd.format(subtotal)}
              </span>
            </div>
            <div className="mt-[4px] flex items-baseline justify-between text-[12px] tabular-nums text-[var(--color-text-sub)]">
              <span>{t("newInvoice.taxRow")}</span>
              <span>{usd.format(taxValue)}</span>
            </div>
            <div className="mt-[6px] flex items-baseline justify-between border-t border-[var(--color-stroke-soft)] pt-[8px]">
              <span className="text-[12px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
                {t("newInvoice.total")}
              </span>
              <span className="text-[20px] font-semibold tabular-nums text-[var(--color-text-strong)]">
                {usd.format(total)}
              </span>
            </div>
          </div>
        </div>

        {error ? (
          <p className="px-[24px] pt-[12px] text-[12px] text-rose-300">
            {error}
          </p>
        ) : null}

        <footer className="mt-[12px] flex items-center justify-end gap-[8px] border-t border-[var(--color-stroke-soft)] px-[24px] py-[16px]">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("modal.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary-orange"
            disabled={
              submitting ||
              !clientId ||
              eligible === null ||
              eligible.length === 0
            }
          >
            {submitting ? t("modal.creating") : t("newInvoice.submit")}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
