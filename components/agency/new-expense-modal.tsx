"use client";

import * as React from "react";
import { RiAddLine, RiAttachmentLine, RiCloseLine } from "@remixicon/react";
import { Modal, ModalCloseButton } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, Input, Textarea } from "@/components/agency/new-client-modal";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import type { Expense, ExpenseCategory, Project } from "@/lib/agency/types";

const CURRENCIES = ["USD", "EUR", "RON", "GBP"];

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

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  projects: Project[];
  defaultCurrency?: string;
  onCreated?: (expense: Expense) => void;
};

function NewExpenseModal({
  open,
  onOpenChange,
  projects,
  defaultCurrency = "USD",
  onCreated,
}: Props) {
  const { t } = useLocale();
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = React.useState(today);
  const [projectId, setProjectId] = React.useState<string>("");
  const [category, setCategory] = React.useState<ExpenseCategory | "">("");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState(defaultCurrency);
  const [note, setNote] = React.useState("");
  const [billable, setBillable] = React.useState(true);
  const [receiptUrl, setReceiptUrl] = React.useState<string | null>(null);
  const [receiptPathname, setReceiptPathname] = React.useState<string | null>(null);
  const [receiptFilename, setReceiptFilename] = React.useState<string | null>(null);
  const [uploadState, setUploadState] = React.useState<"idle" | "uploading" | "error">("idle");
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setDate(today);
      setProjectId("");
      setCategory("");
      setAmount("");
      setCurrency(defaultCurrency);
      setNote("");
      setBillable(true);
      setReceiptUrl(null);
      setReceiptPathname(null);
      setReceiptFilename(null);
      setUploadState("idle");
      setUploadError(null);
      setSubmitting(false);
      setError(null);
    }
  }, [open, today, defaultCurrency]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadState("uploading");
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/agency/expenses/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }
      setReceiptUrl(data.url);
      setReceiptPathname(data.pathname);
      setReceiptFilename(file.name);
      setUploadState("idle");
    } catch (e) {
      setUploadState("error");
      setUploadError((e as Error).message);
    } finally {
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeReceipt() {
    setReceiptUrl(null);
    setReceiptPathname(null);
    setReceiptFilename(null);
    setUploadState("idle");
    setUploadError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) {
      setError(t("newExpense.categoryRequired"));
      return;
    }
    const amountNum = parseFloat(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError(t("newExpense.amountRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/agency/expenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date,
          projectId: projectId || undefined,
          category,
          amount: amountNum,
          currency,
          note: note.trim() || undefined,
          billable,
          receiptUrl: receiptUrl ?? undefined,
          receiptPathname: receiptPathname ?? undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      const created = (await res.json()) as Expense;
      onOpenChange(false);
      onCreated?.(created);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const switchCls = cn(
    "relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer rounded-full",
    "transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-brand-400)]",
    billable
      ? "bg-[var(--color-brand-400)]"
      : "bg-[color-mix(in_oklab,white_12%,transparent)]",
  );
  const switchThumbCls = cn(
    "pointer-events-none inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm",
    "absolute top-[2px] transition-transform duration-200",
    billable ? "translate-x-[20px]" : "translate-x-[2px]",
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel={t("newExpense.title")}
      width={520}
    >
      <ModalCloseButton onClick={() => onOpenChange(false)} />
      <form onSubmit={onSubmit} className="flex flex-col">
        <header className="flex flex-col gap-[4px] px-[24px] pb-[16px] pt-[24px]">
          <h2 className="text-[20px] font-semibold leading-[26px] tracking-tight text-[var(--color-text-strong)]">
            {t("newExpense.title")}
          </h2>
          <p className="text-[13px] text-[var(--color-text-soft)]">
            {t("newExpense.subtitle")}
          </p>
        </header>

        <div className="flex flex-col gap-[14px] px-[24px] pb-[8px]">
          {/* 1. Date */}
          <Field label={t("newExpense.date")} htmlFor="exp-date">
            <Input
              id="exp-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>

          {/* 2. Project */}
          <Field label={t("newExpense.project")}>
            <Select
              value={projectId}
              onValueChange={setProjectId}
            >
              <SelectTrigger
                aria-label={t("newExpense.project")}
                className="text-[14px] font-normal normal-case tracking-normal"
              >
                <SelectValue placeholder={t("newExpense.projectPh")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("newExpense.projectPh")}</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* 3. Category */}
          <Field label={t("newExpense.category")}>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ExpenseCategory)}
            >
              <SelectTrigger
                aria-label={t("newExpense.category")}
                className="text-[14px] font-normal normal-case tracking-normal"
              >
                <SelectValue placeholder={t("newExpense.categoryPh")} />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`expense.cat.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* 4. Amount + Currency */}
          <div className="grid grid-cols-[1fr_120px] gap-[10px]">
            <Field label={t("newExpense.amount")} htmlFor="exp-amount">
              <Input
                id="exp-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </Field>
            <Field label={t("newExpense.currency")}>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="text-[14px] font-normal normal-case tracking-normal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* 5. Note */}
          <Field label={t("newExpense.note")} htmlFor="exp-note">
            <Textarea
              id="exp-note"
              placeholder={t("newExpense.notePh")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </Field>

          {/* 6. Billable toggle */}
          <label className="flex cursor-pointer items-center justify-between gap-[12px]">
            <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
              {t("newExpense.billable")}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={billable}
              onClick={() => setBillable((v) => !v)}
              className={switchCls}
            >
              <span className={switchThumbCls} />
            </button>
          </label>

          {/* 7. Receipt upload */}
          <div className="flex flex-col gap-[6px]">
            <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
              {t("newExpense.receipt")}
            </span>
            {receiptFilename ? (
              <div className="flex items-center gap-[8px] rounded-[6px] bg-[color-mix(in_oklab,white_3%,transparent)] px-[10px] py-[8px] ring-1 ring-[var(--color-stroke-soft)]">
                <RiAttachmentLine
                  size={14}
                  className="shrink-0 text-[var(--color-brand-400)]"
                />
                <span className="flex-1 truncate text-[12px] text-[var(--color-text-strong)]">
                  {receiptFilename}
                </span>
                <button
                  type="button"
                  onClick={removeReceipt}
                  className="shrink-0 text-[var(--color-text-soft)] hover:text-rose-300"
                  aria-label={t("newExpense.receiptRemove")}
                >
                  <RiCloseLine size={14} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-[6px]">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadState === "uploading"}
                  className={cn(
                    "flex h-[36px] items-center gap-[6px] self-start rounded-[6px]",
                    "px-[12px] text-[13px] font-medium",
                    "bg-[color-mix(in_oklab,white_4%,transparent)]",
                    "ring-1 ring-[var(--color-stroke-soft)]",
                    "text-[var(--color-text-strong)] hover:ring-[var(--color-stroke-sub)]",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-colors duration-150",
                  )}
                >
                  <RiAttachmentLine size={14} />
                  {uploadState === "uploading"
                    ? t("newExpense.receiptUploading")
                    : t("newExpense.receipt")}
                </button>
                {uploadState === "error" && uploadError && (
                  <p className="text-[12px] text-rose-300">{uploadError}</p>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              aria-hidden
            />
          </div>
        </div>

        {error ? (
          <p className="px-[24px] pt-[10px] text-[12px] text-rose-300">
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
            disabled={submitting || uploadState === "uploading"}
          >
            {submitting ? t("modal.creating") : t("newExpense.submit")}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export function NewExpenseButton({
  projects,
  defaultCurrency,
  onCreated,
}: {
  projects: Project[];
  defaultCurrency?: string;
  onCreated?: (expense: Expense) => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="primary-orange"
        leadingIcon={<RiAddLine size={16} />}
        onClick={() => setOpen(true)}
      >
        {t("expenses.new")}
      </Button>
      <NewExpenseModal
        open={open}
        onOpenChange={setOpen}
        projects={projects}
        defaultCurrency={defaultCurrency}
        onCreated={onCreated}
      />
    </>
  );
}
