"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RiArrowLeftLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiDownload2Line,
  RiFileCopyLine,
  RiMoreFill,
  RiRepeatLine,
  RiSendPlaneLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Modal, ModalCloseButton } from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { InvoiceStatusPill } from "@/components/agency/invoice-status-pill";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import type {
  Client,
  Expense,
  ExpenseCategory,
  Invoice,
  InvoiceLineItem,
  InvoiceRecurrence,
  InvoiceStatus,
} from "@/lib/agency/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function toDateInputValue(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function fromDateInputValue(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

// ─── Inline input styling ──────────────────────────────────────────────────────

const inputCls = cn(
  "h-[36px] w-full rounded-[6px] bg-[color-mix(in_oklab,white_3%,transparent)]",
  "px-[10px] text-[13px] font-normal text-[var(--color-text-strong)]",
  "placeholder:text-[var(--color-text-soft)]",
  "ring-1 ring-[var(--color-stroke-soft)] outline-none",
  "transition-colors duration-150",
  "hover:ring-[var(--color-stroke-sub)]",
  "focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
);

const textareaCls = cn(
  "min-h-[80px] w-full rounded-[6px] bg-[color-mix(in_oklab,white_3%,transparent)]",
  "px-[10px] py-[8px] text-[13px] font-normal text-[var(--color-text-strong)]",
  "placeholder:text-[var(--color-text-soft)]",
  "ring-1 ring-[var(--color-stroke-soft)] outline-none resize-none",
  "transition-colors duration-150",
  "hover:ring-[var(--color-stroke-sub)]",
  "focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
);

// ─── Autosave hook ─────────────────────────────────────────────────────────────

function useAutosave(
  invoiceId: string,
  onChange: (status: "saving" | "saved" | "idle") => void,
) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = React.useCallback(
    (patch: Record<string, unknown>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      onChange("saving");
      timerRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/agency/invoices/${invoiceId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(patch),
          });
          onChange("saved");
        } catch {
          onChange("idle");
        }
      }, 600);
    },
    [invoiceId, onChange],
  );

  return save;
}

// ─── Recurring Settings Modal ──────────────────────────────────────────────────

function RecurringModal({
  open,
  onOpenChange,
  invoiceId,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId: string;
  initial: {
    recurringEnabled: boolean;
    recurringRecurrence?: InvoiceRecurrence;
    recurringNextIssue?: string;
  };
}) {
  const { t } = useLocale();
  const [enabled, setEnabled] = React.useState(initial.recurringEnabled);
  const [recurrence, setRecurrence] = React.useState<InvoiceRecurrence>(
    initial.recurringRecurrence ?? "monthly",
  );
  const [nextIssue, setNextIssue] = React.useState(
    toDateInputValue(initial.recurringNextIssue),
  );
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setEnabled(initial.recurringEnabled);
      setRecurrence(initial.recurringRecurrence ?? "monthly");
      setNextIssue(toDateInputValue(initial.recurringNextIssue));
    }
  }, [open, initial]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/agency/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recurringEnabled: enabled,
          recurringRecurrence: recurrence,
          recurringNextIssue: fromDateInputValue(nextIssue),
        }),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel={t("invoice.editor.recurringTitle")}
      width={480}
    >
      <ModalCloseButton onClick={() => onOpenChange(false)} />
      <div className="flex flex-col">
        <header className="flex flex-col gap-[4px] px-[24px] pb-[16px] pt-[24px]">
          <h2 className="text-[20px] font-semibold leading-[26px] tracking-tight text-[var(--color-text-strong)]">
            {t("invoice.editor.recurringTitle")}
          </h2>
          <p className="text-[13px] text-[var(--color-text-soft)]">
            {t("invoice.editor.recurringSubtitle")}
          </p>
        </header>

        <div className="flex flex-col gap-[16px] px-[24px] pb-[8px]">
          {/* Enable toggle */}
          <label className="flex cursor-pointer items-center justify-between gap-[12px]">
            <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
              {t("invoice.editor.recurringEnable")}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled((v) => !v)}
              className={cn(
                "relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer rounded-full",
                "transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-brand-400)]",
                enabled
                  ? "bg-[var(--color-brand-400)]"
                  : "bg-[color-mix(in_oklab,white_12%,transparent)]",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm",
                  "absolute top-[2px] transition-transform duration-200",
                  enabled ? "translate-x-[20px]" : "translate-x-[2px]",
                )}
              />
            </button>
          </label>

          {/* Recurrence */}
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
              {t("invoice.editor.recurrence")}
            </label>
            <Select
              value={recurrence}
              onValueChange={(v) => setRecurrence(v as InvoiceRecurrence)}
              disabled={!enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">
                  {t("invoice.editor.recurrenceWeekly")}
                </SelectItem>
                <SelectItem value="monthly">
                  {t("invoice.editor.recurrenceMonthly")}
                </SelectItem>
                <SelectItem value="quarterly">
                  {t("invoice.editor.recurrenceQuarterly")}
                </SelectItem>
                <SelectItem value="yearly">
                  {t("invoice.editor.recurrenceYearly")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Next issue date */}
          <div className="flex flex-col gap-[6px]">
            <label
              htmlFor="rec-next-issue"
              className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-soft)]"
            >
              {t("invoice.editor.nextIssue")}
            </label>
            <input
              id="rec-next-issue"
              type="date"
              value={nextIssue}
              onChange={(e) => setNextIssue(e.target.value)}
              disabled={!enabled}
              className={inputCls}
            />
          </div>
        </div>

        <footer className="mt-[12px] flex items-center justify-end gap-[8px] border-t border-[var(--color-stroke-soft)] px-[24px] py-[16px]">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("modal.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary-orange"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? t("modal.creating") : t("invoice.editor.saveRecurring")}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}

// ─── Import Expenses Modal ─────────────────────────────────────────────────────

const EXPENSE_CATEGORY_KEYS: Record<ExpenseCategory, string> = {
  ai_tools: "expense.cat.ai_tools",
  software: "expense.cat.software",
  hosting: "expense.cat.hosting",
  domain: "expense.cat.domain",
  hardware: "expense.cat.hardware",
  travel: "expense.cat.travel",
  food: "expense.cat.food",
  marketing: "expense.cat.marketing",
  education: "expense.cat.education",
  other: "expense.cat.other",
};

function fmtAmount(amount: number, currency: string) {
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

function ImportTimeModal({
  open,
  onOpenChange,
  invoiceId,
  billableExpenses,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId: string;
  billableExpenses: Expense[];
  onImported: (newLineItems: InvoiceLineItem[]) => void;
}) {
  const { t } = useLocale();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setError(null);
    }
  }, [open]);

  function toggleAll() {
    if (selected.size === billableExpenses.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(billableExpenses.map((e) => e.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleImport() {
    if (selected.size === 0) {
      setError(t("invoice.editor.importExpenses.none"));
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const expenseIds = Array.from(selected);
      // Mark expenses as invoiced — POST to the expenses route with action=attach
      // We use a sentinel id "bulk" and action "attach" pattern
      await fetch(`/api/agency/expenses/bulk/attach`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expenseIds, invoiceId }),
      });

      // Build line items from selected expenses
      const newItems: InvoiceLineItem[] = billableExpenses
        .filter((e) => selected.has(e.id))
        .map((e) => ({
          type: "service" as const,
          description: e.note || t(EXPENSE_CATEGORY_KEYS[e.category]),
          quantity: 1,
          unitPrice: e.amount,
          amount: e.amount,
        }));

      onImported(newItems);
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel={t("invoice.editor.importExpenses.title")}
      width={560}
    >
      <ModalCloseButton onClick={() => onOpenChange(false)} />
      <div className="flex flex-col">
        <header className="flex flex-col gap-[4px] px-[24px] pb-[16px] pt-[24px]">
          <h2 className="text-[20px] font-semibold leading-[26px] tracking-tight text-[var(--color-text-strong)]">
            {t("invoice.editor.importExpenses.title")}
          </h2>
          <p className="text-[13px] text-[var(--color-text-soft)]">
            {t("invoice.editor.importExpenses.subtitle")}
          </p>
        </header>

        <div className="max-h-[360px] overflow-y-auto px-[24px]">
          {billableExpenses.length === 0 ? (
            <p className="py-[24px] text-center text-[13px] text-[var(--color-text-soft)]">
              {t("invoice.editor.importExpenses.empty")}
            </p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-stroke-soft)]">
                  <th className="w-[36px] pb-[8px] text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === billableExpenses.length && billableExpenses.length > 0}
                      onChange={toggleAll}
                      className="accent-[var(--color-brand-400)]"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="pb-[8px] text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
                    Date
                  </th>
                  <th className="pb-[8px] text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
                    Description
                  </th>
                  <th className="pb-[8px] text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {billableExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    onClick={() => toggle(expense.id)}
                    className="cursor-pointer border-b border-[var(--color-stroke-soft)] last:border-0 hover:bg-[color-mix(in_oklab,white_2%,transparent)]"
                  >
                    <td className="py-[10px]">
                      <input
                        type="checkbox"
                        checked={selected.has(expense.id)}
                        onChange={() => toggle(expense.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="accent-[var(--color-brand-400)]"
                        aria-label={`Select expense ${expense.id}`}
                      />
                    </td>
                    <td className="py-[10px] font-mono text-[11px] tabular-nums text-[var(--color-text-sub)]">
                      {expense.date}
                    </td>
                    <td className="py-[10px] pr-[8px] text-[var(--color-text-strong)]">
                      {expense.note || t(EXPENSE_CATEGORY_KEYS[expense.category])}
                    </td>
                    <td className="py-[10px] text-right font-semibold tabular-nums text-[var(--color-text-strong)]">
                      {fmtAmount(expense.amount, expense.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {error ? (
          <p className="px-[24px] pt-[10px] text-[12px] text-rose-300">{error}</p>
        ) : null}

        <footer className="mt-[12px] flex items-center justify-end gap-[8px] border-t border-[var(--color-stroke-soft)] px-[24px] py-[16px]">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("invoice.editor.close")}
          </Button>
          {billableExpenses.length > 0 && (
            <Button
              type="button"
              variant="primary-orange"
              disabled={importing || selected.size === 0}
              onClick={handleImport}
            >
              {importing
                ? t("invoice.editor.importExpenses.importing")
                : t("invoice.editor.importExpenses.import")}
            </Button>
          )}
        </footer>
      </div>
    </Modal>
  );
}

// ─── Delete confirm modal ──────────────────────────────────────────────────────

function DeleteModal({
  open,
  onOpenChange,
  invoiceId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId: string;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await fetch(`/api/agency/invoices/${invoiceId}`, { method: "DELETE" });
      router.push("/agency/invoices");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel="Delete invoice"
      width={400}
    >
      <ModalCloseButton onClick={() => onOpenChange(false)} />
      <div className="flex flex-col px-[24px] py-[24px] gap-[20px]">
        <p className="text-[14px] text-[var(--color-text-strong)] leading-[22px]">
          {t("invoice.editor.deleteConfirm")}
        </p>
        <div className="flex items-center justify-end gap-[8px]">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("modal.cancel")}
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="bg-rose-600 text-white hover:bg-rose-500"
          >
            {t("invoice.editor.deleteConfirmButton")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Line Items Table ──────────────────────────────────────────────────────────

function LineItemRow({
  item,
  index,
  onChange,
  onRemove,
  t,
}: {
  item: InvoiceLineItem;
  index: number;
  onChange: (patch: Partial<InvoiceLineItem>) => void;
  onRemove: () => void;
  t: (key: string) => string;
}) {
  function handleQtyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = parseFloat(e.target.value) || 0;
    onChange({ quantity: q, amount: q * item.unitPrice });
  }
  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const p = parseFloat(e.target.value) || 0;
    onChange({ unitPrice: p, amount: item.quantity * p });
  }

  return (
    <tr className="border-t border-[var(--color-stroke-soft)] group">
      {/* Item type */}
      <td className="px-[8px] py-[8px] align-middle w-[120px]">
        <Select
          value={item.type}
          onValueChange={(v) => onChange({ type: v as "service" | "product" })}
        >
          <SelectTrigger className="h-[32px] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="service">{t("invoice.editor.service")}</SelectItem>
            <SelectItem value="product">{t("invoice.editor.product")}</SelectItem>
          </SelectContent>
        </Select>
      </td>
      {/* Description */}
      <td className="px-[8px] py-[8px] align-middle">
        <input
          type="text"
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={t("invoice.editor.description")}
          className={cn(inputCls, "h-[32px] text-[12px]")}
          aria-label={`Row ${index + 1} description`}
        />
      </td>
      {/* Quantity */}
      <td className="px-[8px] py-[8px] align-middle w-[80px]">
        <input
          type="number"
          min={0}
          step={0.01}
          value={item.quantity}
          onChange={handleQtyChange}
          className={cn(
            inputCls,
            "h-[32px] text-[12px] text-right tabular-nums",
          )}
          aria-label={`Row ${index + 1} quantity`}
        />
      </td>
      {/* Unit price */}
      <td className="px-[8px] py-[8px] align-middle w-[110px]">
        <input
          type="number"
          min={0}
          step={0.01}
          value={item.unitPrice}
          onChange={handlePriceChange}
          className={cn(
            inputCls,
            "h-[32px] text-[12px] text-right tabular-nums",
          )}
          aria-label={`Row ${index + 1} unit price`}
        />
      </td>
      {/* Amount */}
      <td className="px-[8px] py-[8px] align-middle w-[110px] text-right text-[12px] tabular-nums font-semibold text-[var(--color-text-strong)]">
        {usd.format(item.amount)}
      </td>
      {/* Remove */}
      <td className="px-[8px] py-[8px] align-middle w-[36px]">
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove row"
          className={cn(
            "flex h-[28px] w-[28px] items-center justify-center rounded-[4px]",
            "text-[var(--color-text-soft)] opacity-0 group-hover:opacity-100",
            "hover:text-rose-300 hover:bg-[color-mix(in_oklab,#f43f5e_10%,transparent)]",
            "transition-[opacity,background-color,color] duration-150",
          )}
        >
          <RiCloseLine size={15} />
        </button>
      </td>
    </tr>
  );
}

// ─── Party Block (Bill from / Bill to) ────────────────────────────────────────

function PartyBlock({
  title,
  name,
  address,
  email,
  onNameChange,
  onAddressChange,
  onEmailChange,
  namePlaceholder,
  addressPlaceholder,
  emailPlaceholder,
  nameReadOnly,
  editClientButton,
  t,
}: {
  title: string;
  name: string;
  address: string;
  email: string;
  onNameChange?: (v: string) => void;
  onAddressChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  namePlaceholder: string;
  addressPlaceholder: string;
  emailPlaceholder: string;
  nameReadOnly?: boolean;
  editClientButton?: React.ReactNode;
  t: (key: string) => string;
}) {
  const [showAddress, setShowAddress] = React.useState(!!address);
  const [showEmail, setShowEmail] = React.useState(!!email);

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex items-center justify-between gap-[8px]">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand-400)]">
          {title}
        </h3>
        {editClientButton}
      </div>
      {/* Name */}
      {nameReadOnly ? (
        <div className="text-[14px] font-semibold text-[var(--color-text-strong)]">
          {name || <span className="text-[var(--color-text-soft)]">-</span>}
        </div>
      ) : (
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange?.(e.target.value)}
          placeholder={namePlaceholder}
          className={cn(inputCls, "text-[13px]")}
        />
      )}
      {/* Address */}
      {showAddress ? (
        <textarea
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder={addressPlaceholder}
          rows={3}
          className={cn(textareaCls, "min-h-[60px]")}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowAddress(true)}
          className="self-start text-[12px] font-medium text-[var(--color-brand-400)] hover:underline"
        >
          {t("invoice.editor.addAddress")}
        </button>
      )}
      {/* Email */}
      {showEmail ? (
        <input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder={emailPlaceholder}
          className={cn(inputCls, "text-[13px]")}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowEmail(true)}
          className="self-start text-[12px] font-medium text-[var(--color-brand-400)] hover:underline"
        >
          {t("invoice.editor.addEmail")}
        </button>
      )}
    </div>
  );
}

// ─── Section Label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand-400)]">
      {children}
    </h2>
  );
}

// ─── Sticky Footer Save Status ──────────────────────────────────────────────────

function SaveStatus({ status }: { status: "idle" | "saving" | "saved" }) {
  const { t } = useLocale();
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);

  React.useEffect(() => {
    if (status === "saved") setSavedAt(new Date());
  }, [status]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-center h-[36px] border-t border-[var(--color-stroke-soft)] bg-[var(--color-bg-app)] print:hidden">
      <span className="text-[11px] text-[var(--color-text-soft)]">
        {status === "saving"
          ? t("invoice.editor.saving")
          : savedAt
            ? t("invoice.editor.saved", {
                time: savedAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })
            : ""}
      </span>
    </div>
  );
}

// ─── Main InvoiceEditor ────────────────────────────────────────────────────────

export function InvoiceEditor({
  invoice: initialInvoice,
  client,
  billableExpenses = [],
}: {
  invoice: Invoice;
  client: Client | undefined;
  billableExpenses?: Expense[];
}) {
  const { t } = useLocale();
  const router = useRouter();

  // ── Local state mirrors the invoice fields ──
  const [status, setStatus] = React.useState<InvoiceStatus>(
    initialInvoice.status,
  );
  const [issuedAt, setIssuedAt] = React.useState(
    toDateInputValue(initialInvoice.issuedAt),
  );
  const [dueAt, setDueAt] = React.useState(
    toDateInputValue(initialInvoice.dueAt),
  );
  const [billFromName, setBillFromName] = React.useState(
    initialInvoice.billFromName ?? "",
  );
  const [billFromAddress, setBillFromAddress] = React.useState(
    initialInvoice.billFromAddress ?? "",
  );
  const [billFromEmail, setBillFromEmail] = React.useState(
    initialInvoice.billFromEmail ?? "",
  );

  // Hydrate Bill from defaults from /agency/settings on first mount, but only
  // when the invoice doesn't already have its own values and the user hasn't
  // typed anything yet. We don't auto-save these defaults — the user has to
  // accept them by typing/blurring, otherwise the invoice stays as-is.
  const billFromHydratedRef = React.useRef(false);
  React.useEffect(() => {
    if (billFromHydratedRef.current) return;
    if (
      initialInvoice.billFromName ||
      initialInvoice.billFromAddress ||
      initialInvoice.billFromEmail
    ) {
      billFromHydratedRef.current = true;
      return;
    }
    let cancelled = false;
    fetch("/api/agency/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            businessName?: string | null;
            businessAddress?: string | null;
            businessEmail?: string | null;
          } | null,
        ) => {
          if (cancelled || !data) return;
          billFromHydratedRef.current = true;
          if (data.businessName) setBillFromName((prev) => prev || data.businessName!);
          if (data.businessAddress)
            setBillFromAddress((prev) => prev || data.businessAddress!);
          if (data.businessEmail)
            setBillFromEmail((prev) => prev || data.businessEmail!);
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    initialInvoice.billFromName,
    initialInvoice.billFromAddress,
    initialInvoice.billFromEmail,
  ]);
  const [billToAddress, setBillToAddress] = React.useState(
    initialInvoice.billToAddress ?? "",
  );
  const [billToEmail, setBillToEmail] = React.useState(
    initialInvoice.billToEmail ?? "",
  );
  const [subject, setSubject] = React.useState(initialInvoice.subject ?? "");
  const [lineItems, setLineItems] = React.useState<InvoiceLineItem[]>(
    initialInvoice.lineItems,
  );
  const [showDiscount, setShowDiscount] = React.useState(
    initialInvoice.discountAmount > 0,
  );
  const [discountAmount, setDiscountAmount] = React.useState(
    String(initialInvoice.discountAmount || ""),
  );
  const [showTax, setShowTax] = React.useState(initialInvoice.taxPct > 0);
  const [taxPct, setTaxPct] = React.useState(
    String(initialInvoice.taxPct || ""),
  );
  const [notes, setNotes] = React.useState(initialInvoice.notes ?? "");

  // Recurring state
  const [recurringEnabled, setRecurringEnabled] = React.useState(
    initialInvoice.recurringEnabled,
  );
  const [recurringRecurrence, setRecurringRecurrence] = React.useState<
    InvoiceRecurrence | undefined
  >(initialInvoice.recurringRecurrence);
  const [recurringNextIssue, setRecurringNextIssue] = React.useState<
    string | undefined
  >(initialInvoice.recurringNextIssue);

  // Save status
  const [saveStatus, setSaveStatus] = React.useState<
    "idle" | "saving" | "saved"
  >("idle");

  // Modals
  const [recurringOpen, setRecurringOpen] = React.useState(false);
  const [importTimeOpen, setImportTimeOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // Actions busy state
  const [actionBusy, setActionBusy] = React.useState<string | null>(null);

  // ── Autosave ──
  const handleSaveStatusChange = React.useCallback(
    (s: "saving" | "saved" | "idle") => {
      setSaveStatus(s);
    },
    [],
  );
  const save = useAutosave(initialInvoice.id, handleSaveStatusChange);

  // ── Derived totals ──
  const subtotal = lineItems.reduce(
    (s, li) => s + (li.amount || li.quantity * li.unitPrice),
    0,
  );
  const discAmt = parseFloat(discountAmount) || 0;
  const taxPctNum = parseFloat(taxPct) || 0;
  const taxedBase = Math.max(0, subtotal - discAmt);
  const taxAmt = (taxedBase * taxPctNum) / 100;
  const total = taxedBase + taxAmt;

  // ── Field change helpers that trigger autosave ──
  function field<T>(
    setter: (v: T) => void,
    patchKey: string,
    transform?: (v: T) => unknown,
  ) {
    return (v: T) => {
      setter(v);
      save({ [patchKey]: transform ? transform(v) : v });
    };
  }

  function handleIssuedAtChange(e: React.ChangeEvent<HTMLInputElement>) {
    setIssuedAt(e.target.value);
    save({ issuedAt: fromDateInputValue(e.target.value) });
  }
  function handleDueAtChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDueAt(e.target.value);
    save({ dueAt: fromDateInputValue(e.target.value) });
  }
  function handleBillFromNameChange(v: string) {
    setBillFromName(v);
    save({ billFromName: v || null });
  }
  function handleBillFromAddressChange(v: string) {
    setBillFromAddress(v);
    save({ billFromAddress: v || null });
  }
  function handleBillFromEmailChange(v: string) {
    setBillFromEmail(v);
    save({ billFromEmail: v || null });
  }
  function handleBillToAddressChange(v: string) {
    setBillToAddress(v);
    save({ billToAddress: v || null });
  }
  function handleBillToEmailChange(v: string) {
    setBillToEmail(v);
    save({ billToEmail: v || null });
  }
  function handleSubjectChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSubject(e.target.value);
    save({ subject: e.target.value || null });
  }
  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNotes(e.target.value);
    save({ notes: e.target.value || null });
  }
  function handleDiscountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDiscountAmount(e.target.value);
    save({ discountAmount: parseFloat(e.target.value) || 0 });
  }
  function handleTaxPctChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTaxPct(e.target.value);
    save({ taxPct: parseFloat(e.target.value) || 0 });
  }

  // ── Line item helpers ──
  function updateLineItem(index: number, patch: Partial<InvoiceLineItem>) {
    const next = lineItems.map((li, i) =>
      i === index ? { ...li, ...patch } : li,
    );
    setLineItems(next);
    save({ lineItems: next });
  }
  function removeLineItem(index: number) {
    const next = lineItems.filter((_, i) => i !== index);
    setLineItems(next);
    save({ lineItems: next });
  }
  function addLineItem() {
    const next: InvoiceLineItem[] = [
      ...lineItems,
      { type: "service", description: "", quantity: 1, unitPrice: 0, amount: 0 },
    ];
    setLineItems(next);
    save({ lineItems: next });
  }

  // ── Status actions ──
  async function doAction(action: string) {
    setActionBusy(action);
    try {
      const res = await fetch(
        `/api/agency/invoices/${initialInvoice.id}/${action}`,
        { method: "POST" },
      );
      if (res.ok) {
        if (action === "duplicate") {
          const dup = (await res.json()) as Invoice;
          router.push(`/agency/invoices/${dup.id}`);
        } else {
          const updated = (await res.json()) as Invoice;
          setStatus(updated.status);
          router.refresh();
        }
      }
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <>
      {/* ── Page chrome ── */}
      <div className="flex flex-wrap items-center justify-between gap-[12px] print:hidden">
        {/* Left: breadcrumb + invoice number + status */}
        <div className="flex items-center gap-[10px] flex-wrap">
          <Link
            href="/agency/invoices"
            className="inline-flex items-center gap-[6px] text-[12px] font-semibold text-[var(--color-text-soft)] hover:text-[var(--color-text-strong)]"
          >
            <RiArrowLeftLine size={14} />
            {t("invoice.editor.breadcrumb")}
          </Link>
          <span className="text-[var(--color-stroke-soft)]">/</span>
          <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
            {initialInvoice.number}
          </span>
          <InvoiceStatusPill status={status} />
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-[8px] flex-wrap">
          {/* Download */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            leadingIcon={<RiDownload2Line size={15} />}
            onClick={() => window.print()}
          >
            {t("invoice.editor.downloadInvoice")}
          </Button>

          {/* Send */}
          <Button
            type="button"
            variant="primary-orange"
            size="sm"
            leadingIcon={<RiSendPlaneLine size={15} />}
            onClick={() => doAction("issue")}
            disabled={actionBusy !== null || status !== "draft"}
          >
            {t("invoice.editor.sendInvoice")}
          </Button>

          {/* Recurring settings */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            leadingIcon={<RiRepeatLine size={15} />}
            onClick={() => setRecurringOpen(true)}
          >
            {t("invoice.editor.recurringSettings")}
          </Button>

          {/* Actions dropdown */}
          <Dropdown>
            <DropdownTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                {t("invoice.editor.actions")}
                <RiMoreFill size={15} className="ml-[4px]" />
              </Button>
            </DropdownTrigger>
            <DropdownContent align="end">
              <DropdownItem
                onSelect={() => doAction("issue")}
                disabled={actionBusy !== null || status === "sent"}
              >
                <RiSendPlaneLine size={15} />
                {t("invoice.editor.markAsSent")}
              </DropdownItem>
              <DropdownItem
                onSelect={() => doAction("pay")}
                disabled={actionBusy !== null || status === "paid"}
              >
                <RiCheckLine size={15} />
                {t("invoice.editor.markAsPaid")}
              </DropdownItem>
              <DropdownItem
                onSelect={() => doAction("void")}
                disabled={actionBusy !== null || status === "void"}
              >
                <RiCloseLine size={15} />
                {t("invoice.editor.markAsVoid")}
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem onSelect={() => doAction("duplicate")}>
                <RiFileCopyLine size={15} />
                {t("invoice.editor.duplicate")}
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                onSelect={() => setDeleteOpen(true)}
                className="text-rose-300 data-[highlighted]:text-rose-200"
              >
                <RiDeleteBinLine size={15} />
                {t("invoice.editor.delete")}
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      </div>

      {/* ── Document card ── */}
      <article
        className={cn(
          "invoice-doc enter-stagger mt-[16px] mb-[48px] rounded-[8px]",
          "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
          "p-[28px] sm:p-[40px]",
        )}
      >
        {/* Issue / Due dates */}
        <div className="grid grid-cols-2 gap-[16px] sm:grid-cols-4 border-b border-[var(--color-stroke-soft)] pb-[24px] mb-[24px]">
          <div className="flex flex-col gap-[6px]">
            <label
              htmlFor="iv-issued-at"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-soft)]"
            >
              {t("invoice.editor.issueDate")}
            </label>
            <input
              id="iv-issued-at"
              type="date"
              value={issuedAt}
              onChange={handleIssuedAtChange}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label
              htmlFor="iv-due-at"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-soft)]"
            >
              {t("invoice.editor.dueDate")}
            </label>
            <input
              id="iv-due-at"
              type="date"
              value={dueAt}
              onChange={handleDueAtChange}
              className={inputCls}
            />
          </div>
          <div className="col-span-2 flex flex-col justify-end">
            <div className="flex items-center gap-[10px]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-soft)]">
                {initialInvoice.number}
              </span>
              <InvoiceStatusPill status={status} />
            </div>
          </div>
        </div>

        {/* Bill from / to */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[20px] mb-[24px]">
          <div className="rounded-[6px] bg-[color-mix(in_oklab,white_2%,transparent)] p-[16px] ring-1 ring-[var(--color-stroke-soft)]">
            <PartyBlock
              title={t("invoice.editor.billFrom")}
              name={billFromName}
              address={billFromAddress}
              email={billFromEmail}
              onNameChange={handleBillFromNameChange}
              onAddressChange={handleBillFromAddressChange}
              onEmailChange={handleBillFromEmailChange}
              namePlaceholder={t("invoice.editor.billFromName")}
              addressPlaceholder={t("invoice.editor.billFromAddress")}
              emailPlaceholder={t("invoice.editor.billFromEmail")}
              t={t}
            />
          </div>
          <div className="rounded-[6px] bg-[color-mix(in_oklab,white_2%,transparent)] p-[16px] ring-1 ring-[var(--color-stroke-soft)]">
            <PartyBlock
              title={t("invoice.editor.billTo")}
              name={client?.name ?? initialInvoice.billToName ?? ""}
              address={billToAddress}
              email={billToEmail}
              onAddressChange={handleBillToAddressChange}
              onEmailChange={handleBillToEmailChange}
              namePlaceholder={t("invoice.editor.billFromName")}
              addressPlaceholder={t("invoice.editor.billToAddress")}
              emailPlaceholder={t("invoice.editor.billToEmail")}
              nameReadOnly
              t={t}
            />
          </div>
        </div>

        {/* Subject */}
        <div className="flex flex-col gap-[6px] mb-[28px]">
          <label
            htmlFor="iv-subject"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-soft)]"
          >
            {t("invoice.editor.subject")}
          </label>
          <input
            id="iv-subject"
            type="text"
            value={subject}
            onChange={handleSubjectChange}
            placeholder={t("invoice.editor.subjectPh")}
            className={inputCls}
          />
        </div>

        {/* Invoice items */}
        <section className="mb-[24px]">
          <SectionLabel>{t("invoice.lineItems")}</SectionLabel>
          <div className="mt-[12px] scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[680px] text-[13px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
                  <th className="px-[8px] pb-[8px] font-semibold">
                    {t("invoice.editor.itemType")}
                  </th>
                  <th className="px-[8px] pb-[8px] font-semibold">
                    {t("invoice.editor.description")}
                  </th>
                  <th className="px-[8px] pb-[8px] font-semibold text-right">
                    {t("invoice.editor.quantity")}
                  </th>
                  <th className="px-[8px] pb-[8px] font-semibold text-right">
                    {t("invoice.editor.unitPrice")}
                  </th>
                  <th className="px-[8px] pb-[8px] font-semibold text-right">
                    {t("invoice.editor.amount")}
                  </th>
                  <th className="px-[8px] pb-[8px] w-[36px]" />
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <LineItemRow
                    key={i}
                    item={item}
                    index={i}
                    onChange={(patch) => updateLineItem(i, patch)}
                    onRemove={() => removeLineItem(i)}
                    t={t}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Below table actions */}
          <div className="mt-[12px] flex items-center gap-[12px] flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setImportTimeOpen(true)}
            >
              {t("invoice.editor.importTime")}
            </Button>
            <button
              type="button"
              onClick={addLineItem}
              className="text-[12px] font-semibold text-[var(--color-brand-400)] hover:underline"
            >
              {t("invoice.editor.addNewItem")}
            </button>
          </div>
        </section>

        {/* Discount / Tax toggles */}
        <div className="flex items-center gap-[12px] mb-[20px] flex-wrap">
          {!showDiscount && (
            <button
              type="button"
              onClick={() => setShowDiscount(true)}
              className="text-[12px] font-semibold text-[var(--color-text-sub)] hover:text-[var(--color-brand-400)]"
            >
              {t("invoice.editor.addDiscount")}
            </button>
          )}
          {!showTax && (
            <button
              type="button"
              onClick={() => setShowTax(true)}
              className="text-[12px] font-semibold text-[var(--color-text-sub)] hover:text-[var(--color-brand-400)]"
            >
              {t("invoice.editor.addTax")}
            </button>
          )}
        </div>

        {/* Totals block */}
        <div className="flex justify-end mb-[28px]">
          <dl className="w-full max-w-[340px] rounded-[6px] bg-[color-mix(in_oklab,white_2%,transparent)] p-[16px] ring-1 ring-[var(--color-stroke-soft)] space-y-[10px]">
            <TotalsRow
              label={t("invoice.editor.subtotal")}
              value={usd.format(subtotal)}
            />

            {showDiscount && (
              <div className="flex items-center justify-between gap-[8px]">
                <span className="text-[12px] text-[var(--color-text-soft)]">
                  {t("invoice.editor.discount")}
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={discountAmount}
                  onChange={handleDiscountChange}
                  placeholder={t("invoice.editor.discountPh")}
                  className={cn(
                    inputCls,
                    "h-[30px] w-[120px] text-right text-[12px] tabular-nums",
                  )}
                />
              </div>
            )}

            {showTax && (
              <div className="flex items-center justify-between gap-[8px]">
                <span className="text-[12px] text-[var(--color-text-soft)]">
                  {t("invoice.editor.taxPct")}
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={taxPct}
                  onChange={handleTaxPctChange}
                  placeholder={t("invoice.editor.taxPctPh")}
                  className={cn(
                    inputCls,
                    "h-[30px] w-[80px] text-right text-[12px] tabular-nums",
                  )}
                />
              </div>
            )}

            {discAmt > 0 && (
              <TotalsRow
                label={`${t("invoice.editor.discount")} (−)`}
                value={usd.format(discAmt)}
              />
            )}
            {taxPctNum > 0 && (
              <TotalsRow
                label={`${t("invoice.editor.taxPct")} (${taxPctNum}%)`}
                value={usd.format(taxAmt)}
              />
            )}

            <div className="border-t border-[var(--color-stroke-soft)] pt-[8px] space-y-[6px]">
              <TotalsRow
                label={t("invoice.editor.total")}
                value={usd.format(total)}
                emphasize
              />
              <TotalsRow
                label={t("invoice.editor.totalDue")}
                value={usd.format(total)}
                emphasize
              />
            </div>
          </dl>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-[6px]">
          <label
            htmlFor="iv-notes"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-soft)]"
          >
            {t("invoice.editor.notes")}
          </label>
          <textarea
            id="iv-notes"
            value={notes}
            onChange={handleNotesChange}
            placeholder={t("invoice.editor.notesPh")}
            rows={4}
            className={textareaCls}
          />
        </div>
      </article>

      {/* ── Sticky footer ── */}
      <SaveStatus status={saveStatus} />

      {/* ── Modals ── */}
      <RecurringModal
        open={recurringOpen}
        onOpenChange={(v) => {
          setRecurringOpen(v);
          if (!v) {
            // Refresh recurring state from server on close
            setRecurringEnabled(recurringEnabled);
            setRecurringRecurrence(recurringRecurrence);
            setRecurringNextIssue(recurringNextIssue);
          }
        }}
        invoiceId={initialInvoice.id}
        initial={{ recurringEnabled, recurringRecurrence, recurringNextIssue }}
      />
      <ImportTimeModal
        open={importTimeOpen}
        onOpenChange={setImportTimeOpen}
        invoiceId={initialInvoice.id}
        billableExpenses={billableExpenses}
        onImported={(newLineItems) => {
          const next = [...lineItems, ...newLineItems];
          setLineItems(next);
          save({ lineItems: next });
        }}
      />
      <DeleteModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        invoiceId={initialInvoice.id}
      />
    </>
  );
}

// ─── Totals row helper ─────────────────────────────────────────────────────────

function TotalsRow({
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
            ? "text-[18px] font-semibold text-[var(--color-text-strong)]"
            : "text-[13px] text-[var(--color-text-sub)]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
