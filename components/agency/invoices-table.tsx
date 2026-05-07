"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  RiArrowUpSLine,
  RiArrowDownSLine,
  RiMoreLine,
  RiSettings4Line,
  RiAddLine,
  RiFileDownloadLine,
} from "@remixicon/react";
import { ClientAvatar } from "@/components/agency/client-avatar";
import { InvoiceStatusPill } from "@/components/agency/invoice-status-pill";
import { CopyIdButton } from "@/components/agency/copy-id-button";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { CompactButton } from "@/components/ui/compact-button";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import type { Invoice, Client, InvoiceStatus } from "@/lib/agency/types";

// ── helpers ──────────────────────────────────────────────────────────────────

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function computeBalance(inv: Invoice): number {
  if (inv.status === "paid") return 0;
  return inv.totalUsd;
}

function dateCutoffs(preset: string): { from?: Date; to?: Date } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "thisMonth":
      return {
        from: new Date(y, m, 1),
        to: new Date(y, m + 1, 0, 23, 59, 59),
      };
    case "lastMonth":
      return {
        from: new Date(y, m - 1, 1),
        to: new Date(y, m, 0, 23, 59, 59),
      };
    case "thisYear":
      return {
        from: new Date(y, 0, 1),
        to: new Date(y, 11, 31, 23, 59, 59),
      };
    case "lastYear":
      return {
        from: new Date(y - 1, 0, 1),
        to: new Date(y - 1, 11, 31, 23, 59, 59),
      };
    default:
      return {};
  }
}

type SortKey =
  | "number"
  | "client"
  | "issueDate"
  | "dueOn"
  | "amount"
  | "balance"
  | "status";
type SortDir = "asc" | "desc";

// ── sub-components ────────────────────────────────────────────────────────────

function SortableTh({
  col,
  currentSort,
  currentDir,
  onSort,
  align = "left",
  children,
}: {
  col: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (col: SortKey) => void;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const active = currentSort === col;
  const Icon = active && currentDir === "asc" ? RiArrowUpSLine : RiArrowDownSLine;
  return (
    <th
      className={cn(
        "whitespace-nowrap px-[12px] pb-[10px] font-semibold",
        align === "right" && "text-right",
      )}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn(
          "inline-flex items-center gap-[4px] text-[11px] uppercase tracking-[0.04em]",
          "transition-colors duration-150",
          active
            ? "text-[var(--color-brand-400)]"
            : "text-[var(--color-text-soft)] hover:text-[var(--color-text-sub)]",
        )}
      >
        {children}
        <Icon
          size={14}
          className={cn(
            "shrink-0 transition-opacity",
            active ? "opacity-100" : "opacity-0 group-hover:opacity-60",
          )}
        />
      </button>
    </th>
  );
}

// ── Date range popover ────────────────────────────────────────────────────────

function DateDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  const presets = [
    { key: "allTime", label: t("invoiceList.allTime") },
    { key: "thisMonth", label: t("invoiceList.thisMonth") },
    { key: "lastMonth", label: t("invoiceList.lastMonth") },
    { key: "thisYear", label: t("invoiceList.thisYear") },
    { key: "lastYear", label: t("invoiceList.lastYear") },
  ];
  const current = presets.find((p) => p.key === value) ?? presets[0];
  return (
    <Dropdown open={open} onOpenChange={setOpen}>
      <DropdownTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-[32px] items-center gap-[6px] rounded-[6px] px-[10px]",
            "text-[12px] font-medium text-[var(--color-text-sub)]",
            "ring-1 ring-[var(--color-stroke-soft)]",
            "transition-colors duration-150 hover:text-[var(--color-text-strong)] hover:ring-[var(--color-stroke-sub)]",
            open && "ring-[var(--color-stroke-sub)] text-[var(--color-text-strong)]",
          )}
        >
          {current.label}
          <RiArrowDownSLine size={14} className="shrink-0 text-[var(--color-text-soft)]" />
        </button>
      </DropdownTrigger>
      <DropdownContent align="start" sideOffset={6}>
        {presets.map((p) => (
          <DropdownItem
            key={p.key}
            onSelect={() => {
              onChange(p.key);
              setOpen(false);
            }}
            className={cn(p.key === value && "text-[var(--color-brand-400)]")}
          >
            {p.label}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}

// ── Multi-select dropdown ─────────────────────────────────────────────────────

function MultiSelectDropdown<T extends string>({
  options,
  value,
  onChange,
  allLabel,
}: {
  options: { key: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  allLabel: string;
}) {
  const [open, setOpen] = React.useState(false);
  const display =
    value.length === 0 ? allLabel : value.length === 1 ? options.find((o) => o.key === value[0])?.label ?? value[0] : `${value.length} selected`;

  function toggle(key: T) {
    if (value.includes(key)) {
      onChange(value.filter((v) => v !== key));
    } else {
      onChange([...value, key]);
    }
  }

  return (
    <Dropdown open={open} onOpenChange={setOpen}>
      <DropdownTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-[32px] items-center gap-[6px] rounded-[6px] px-[10px]",
            "text-[12px] font-medium text-[var(--color-text-sub)]",
            "ring-1 ring-[var(--color-stroke-soft)]",
            "transition-colors duration-150 hover:text-[var(--color-text-strong)] hover:ring-[var(--color-stroke-sub)]",
            open && "ring-[var(--color-stroke-sub)] text-[var(--color-text-strong)]",
            value.length > 0 && "text-[var(--color-brand-400)] ring-[color-mix(in_oklab,var(--color-brand-400)_28%,transparent)]",
          )}
        >
          {display}
          <RiArrowDownSLine size={14} className="shrink-0 text-[var(--color-text-soft)]" />
        </button>
      </DropdownTrigger>
      <DropdownContent align="start" sideOffset={6}>
        {options.map((opt) => (
          <DropdownItem
            key={opt.key}
            onSelect={(e) => {
              e.preventDefault();
              toggle(opt.key);
            }}
            className="gap-[8px]"
          >
            <span
              className={cn(
                "flex size-[14px] shrink-0 items-center justify-center rounded-[3px]",
                "ring-1 ring-[var(--color-stroke-soft)] transition-colors",
                value.includes(opt.key)
                  ? "bg-[var(--color-brand-400)] ring-[var(--color-brand-400)]"
                  : "bg-transparent",
              )}
            >
              {value.includes(opt.key) ? (
                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                  <path
                    d="M1 3L3 5L7 1"
                    stroke="#0b1f21"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            {opt.label}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}

// ── Range dropdown ────────────────────────────────────────────────────────────

function RangeDropdown({
  label,
  minKey,
  maxKey,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  anyLabel,
}: {
  label: string;
  minKey: string;
  maxKey: string;
  minValue: string;
  maxValue: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  anyLabel: string;
}) {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  const hasFilter = minValue !== "" || maxValue !== "";
  const display = hasFilter
    ? [minValue && `≥${minValue}`, maxValue && `≤${maxValue}`]
        .filter(Boolean)
        .join(" ")
    : label;

  return (
    <Dropdown open={open} onOpenChange={setOpen}>
      <DropdownTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-[32px] items-center gap-[6px] rounded-[6px] px-[10px]",
            "text-[12px] font-medium text-[var(--color-text-sub)]",
            "ring-1 ring-[var(--color-stroke-soft)]",
            "transition-colors duration-150 hover:text-[var(--color-text-strong)] hover:ring-[var(--color-stroke-sub)]",
            open && "ring-[var(--color-stroke-sub)] text-[var(--color-text-strong)]",
            hasFilter && "text-[var(--color-brand-400)] ring-[color-mix(in_oklab,var(--color-brand-400)_28%,transparent)]",
          )}
        >
          {display}
          <RiArrowDownSLine size={14} className="shrink-0 text-[var(--color-text-soft)]" />
        </button>
      </DropdownTrigger>
      <DropdownContent align="start" sideOffset={6} className="min-w-[200px] p-[12px]">
        <div className="flex flex-col gap-[8px]">
          <label className="flex flex-col gap-[4px]">
            <span className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
              {t("invoiceList.min")}
            </span>
            <input
              id={minKey}
              type="number"
              min={0}
              step={0.01}
              value={minValue}
              onChange={(e) => onMinChange(e.target.value)}
              placeholder="0"
              className={cn(
                "h-[32px] w-full rounded-[6px] bg-[color-mix(in_oklab,white_4%,transparent)]",
                "px-[10px] text-[13px] text-[var(--color-text-strong)]",
                "ring-1 ring-[var(--color-stroke-soft)] outline-none",
                "focus:ring-[var(--color-brand-400)]",
                "placeholder:text-[var(--color-text-soft)]",
              )}
            />
          </label>
          <label className="flex flex-col gap-[4px]">
            <span className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
              {t("invoiceList.max")}
            </span>
            <input
              id={maxKey}
              type="number"
              min={0}
              step={0.01}
              value={maxValue}
              onChange={(e) => onMaxChange(e.target.value)}
              placeholder="∞"
              className={cn(
                "h-[32px] w-full rounded-[6px] bg-[color-mix(in_oklab,white_4%,transparent)]",
                "px-[10px] text-[13px] text-[var(--color-text-strong)]",
                "ring-1 ring-[var(--color-stroke-soft)] outline-none",
                "focus:ring-[var(--color-brand-400)]",
                "placeholder:text-[var(--color-text-soft)]",
              )}
            />
          </label>
          {hasFilter ? (
            <button
              type="button"
              onClick={() => {
                onMinChange("");
                onMaxChange("");
              }}
              className="mt-[2px] text-[11px] text-[var(--color-text-soft)] hover:text-[var(--color-text-sub)] text-left"
            >
              {anyLabel}
            </button>
          ) : null}
        </div>
      </DropdownContent>
    </Dropdown>
  );
}

// ── Row actions ───────────────────────────────────────────────────────────────

function RowActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function callAction(action: string) {
    setBusy(true);
    try {
      await fetch(`/api/agency/invoices/${invoiceId}/${action}`, {
        method: "POST",
      });
      router.refresh();
    } catch {
      // silently fail — action endpoints may not exist yet in this agent's scope
    } finally {
      setBusy(false);
    }
  }

  async function callDelete() {
    setBusy(true);
    try {
      await fetch(`/api/agency/invoices/${invoiceId}`, { method: "DELETE" });
      router.refresh();
    } catch {
      // silently fail
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <CompactButton
          aria-label="Invoice actions"
          variant="neutral"
          size="sm"
          disabled={busy}
          onClick={(e) => e.stopPropagation()}
        >
          <RiMoreLine size={16} />
        </CompactButton>
      </DropdownTrigger>
      <DropdownContent align="end" onClick={(e) => e.stopPropagation()}>
        {status === "draft" ? (
          <DropdownItem onSelect={() => callAction("issue")}>
            {t("invoiceList.actions.markSent")}
          </DropdownItem>
        ) : null}
        {status !== "paid" && status !== "void" ? (
          <DropdownItem onSelect={() => callAction("pay")}>
            {t("invoiceList.actions.markPaid")}
          </DropdownItem>
        ) : null}
        {status !== "void" ? (
          <DropdownItem onSelect={() => callAction("void")}>
            {t("invoiceList.actions.markVoid")}
          </DropdownItem>
        ) : null}
        <DropdownItem onSelect={() => callAction("duplicate")}>
          {t("invoiceList.actions.duplicate")}
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem
          onSelect={callDelete}
          className="text-rose-300 data-[highlighted]:text-rose-300 data-[highlighted]:bg-[color-mix(in_oklab,#f43f5e_10%,transparent)]"
        >
          {t("invoiceList.actions.delete")}
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface InvoicesTableProps {
  invoices: Invoice[];
  clients: Client[];
  initialSort: SortKey;
  initialDir: SortDir;
  initialStatus: InvoiceStatus[];
  initialClientIds: string[];
  initialDatePreset: string;
  initialQ: string;
  initialAmountMin: string;
  initialAmountMax: string;
  initialBalanceMin: string;
  initialBalanceMax: string;
}

export function InvoicesTable({
  invoices,
  clients,
  initialSort,
  initialDir,
  initialStatus,
  initialClientIds,
  initialDatePreset,
  initialQ,
  initialAmountMin,
  initialAmountMax,
  initialBalanceMin,
  initialBalanceMax,
}: InvoicesTableProps) {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── local draft filter state (committed on "Apply filter") ────────────────
  const [draftDatePreset, setDraftDatePreset] = React.useState(initialDatePreset);
  const [draftClientIds, setDraftClientIds] = React.useState<string[]>(initialClientIds);
  const [draftStatuses, setDraftStatuses] = React.useState<InvoiceStatus[]>(initialStatus);
  const [draftAmountMin, setDraftAmountMin] = React.useState(initialAmountMin);
  const [draftAmountMax, setDraftAmountMax] = React.useState(initialAmountMax);
  const [draftBalanceMin, setDraftBalanceMin] = React.useState(initialBalanceMin);
  const [draftBalanceMax, setDraftBalanceMax] = React.useState(initialBalanceMax);
  const [q, setQ] = React.useState(initialQ);

  // ── sort ──────────────────────────────────────────────────────────────────
  const [sort, setSort] = React.useState<SortKey>(initialSort);
  const [dir, setDir] = React.useState<SortDir>(initialDir);

  function handleSort(col: SortKey) {
    const nextDir = sort === col && dir === "asc" ? "desc" : "asc";
    setSort(col);
    setDir(nextDir);
    pushParams({ sort: col, dir: nextDir });
  }

  // ── URL helpers ───────────────────────────────────────────────────────────
  function pushParams(overrides: Record<string, string | string[]>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (Array.isArray(v)) {
        if (v.length === 0) params.delete(k);
        else params.set(k, v.join(","));
      } else {
        if (!v) params.delete(k);
        else params.set(k, v);
      }
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyFilters() {
    pushParams({
      status: draftStatuses,
      client: draftClientIds,
      date: draftDatePreset === "allTime" ? "" : draftDatePreset,
      q: q,
      amountMin: draftAmountMin,
      amountMax: draftAmountMax,
      balanceMin: draftBalanceMin,
      balanceMax: draftBalanceMax,
      sort,
      dir,
    });
  }

  // ── filtering ─────────────────────────────────────────────────────────────
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const filtered = React.useMemo(() => {
    let rows = invoices.slice();

    // q / search
    const trimQ = q.trim().toLowerCase();
    if (trimQ) {
      rows = rows.filter((inv) => inv.number.toLowerCase().includes(trimQ));
    }

    // status
    if (initialStatus.length > 0) {
      rows = rows.filter((inv) => initialStatus.includes(inv.status));
    }

    // client
    if (initialClientIds.length > 0) {
      rows = rows.filter((inv) => initialClientIds.includes(inv.clientId));
    }

    // date
    if (initialDatePreset && initialDatePreset !== "allTime") {
      const { from, to } = dateCutoffs(initialDatePreset);
      rows = rows.filter((inv) => {
        const dateStr = inv.issuedAt ?? inv.periodEnd;
        const d = new Date(dateStr);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    // amount
    const amountMin = initialAmountMin !== "" ? Number(initialAmountMin) : undefined;
    const amountMax = initialAmountMax !== "" ? Number(initialAmountMax) : undefined;
    if (amountMin !== undefined)
      rows = rows.filter((inv) => inv.totalUsd >= amountMin);
    if (amountMax !== undefined)
      rows = rows.filter((inv) => inv.totalUsd <= amountMax);

    // balance
    const balanceMin = initialBalanceMin !== "" ? Number(initialBalanceMin) : undefined;
    const balanceMax = initialBalanceMax !== "" ? Number(initialBalanceMax) : undefined;
    if (balanceMin !== undefined)
      rows = rows.filter((inv) => computeBalance(inv) >= balanceMin);
    if (balanceMax !== undefined)
      rows = rows.filter((inv) => computeBalance(inv) <= balanceMax);

    return rows;
  }, [
    invoices,
    q,
    initialStatus,
    initialClientIds,
    initialDatePreset,
    initialAmountMin,
    initialAmountMax,
    initialBalanceMin,
    initialBalanceMax,
  ]);

  const sorted = React.useMemo(() => {
    const rows = filtered.slice();
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case "number":
          cmp = a.number.localeCompare(b.number);
          break;
        case "client": {
          const ca = clientMap.get(a.clientId)?.name ?? "";
          const cb = clientMap.get(b.clientId)?.name ?? "";
          cmp = ca.localeCompare(cb);
          break;
        }
        case "issueDate":
          cmp = (a.issuedAt ?? a.periodEnd).localeCompare(b.issuedAt ?? b.periodEnd);
          break;
        case "dueOn":
          cmp = (a.dueAt ?? "").localeCompare(b.dueAt ?? "");
          break;
        case "amount":
          cmp = a.totalUsd - b.totalUsd;
          break;
        case "balance":
          cmp = computeBalance(a) - computeBalance(b);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return dir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [filtered, sort, dir, clientMap]);

  // ── overdue helpers ───────────────────────────────────────────────────────
  function daysOverdue(inv: Invoice): number {
    if (inv.status !== "overdue" || !inv.dueAt) return 0;
    const due = new Date(inv.dueAt);
    return Math.floor((Date.now() - due.getTime()) / (24 * 60 * 60 * 1000));
  }

  // ── client options for multi-select ──────────────────────────────────────
  const clientOptions = clients.map((c) => ({ key: c.id, label: c.name }));

  const statusOptions: { key: InvoiceStatus; label: string }[] = [
    { key: "draft", label: t("invoiceStatus.draft") },
    { key: "sent", label: t("invoiceStatus.sent") },
    { key: "paid", label: t("invoiceStatus.paid") },
    { key: "overdue", label: t("invoiceStatus.overdue") },
    { key: "void", label: t("invoiceStatus.void") },
  ];

  return (
    <div className="flex flex-col gap-[16px]">
      {/* ── Filter bar ── */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-[8px] rounded-[8px] px-[16px] py-[12px]",
          "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
        )}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-soft)]">
          {t("invoiceList.filter")}
        </span>

        <div className="h-[16px] w-px bg-[var(--color-stroke-soft)]" />

        <DateDropdown
          value={draftDatePreset}
          onChange={setDraftDatePreset}
        />

        <MultiSelectDropdown
          options={clientOptions}
          value={draftClientIds}
          onChange={setDraftClientIds}
          allLabel={t("invoiceList.allClients")}
        />

        <MultiSelectDropdown
          options={statusOptions}
          value={draftStatuses}
          onChange={(v) => setDraftStatuses(v as InvoiceStatus[])}
          allLabel={t("invoiceList.allStatuses")}
        />

        <RangeDropdown
          label={t("invoiceList.col.amount")}
          minKey="amountMin"
          maxKey="amountMax"
          minValue={draftAmountMin}
          maxValue={draftAmountMax}
          onMinChange={setDraftAmountMin}
          onMaxChange={setDraftAmountMax}
          anyLabel={t("invoiceList.any")}
        />

        <RangeDropdown
          label={t("invoiceList.col.balance")}
          minKey="balanceMin"
          maxKey="balanceMax"
          minValue={draftBalanceMin}
          maxValue={draftBalanceMax}
          onMinChange={setDraftBalanceMin}
          onMaxChange={setDraftBalanceMax}
          anyLabel={t("invoiceList.any")}
        />

        <div className="ml-auto flex items-center gap-[8px]">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            placeholder={t("invoiceList.searchPlaceholder")}
            className={cn(
              "h-[32px] w-[200px] rounded-[6px] bg-[color-mix(in_oklab,white_4%,transparent)]",
              "px-[10px] text-[12px] text-[var(--color-text-strong)]",
              "ring-1 ring-[var(--color-stroke-soft)] outline-none",
              "focus:ring-[var(--color-brand-400)]",
              "placeholder:text-[var(--color-text-soft)]",
            )}
          />
          <Button variant="outline" size="sm" onClick={applyFilters}>
            {t("invoiceList.applyFilter")}
          </Button>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="rounded-[8px] bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]">
        {/* card header */}
        <div className="flex items-center justify-between border-b border-[var(--color-stroke-soft)] px-[20px] py-[14px]">
          <h2 className="text-[13px] font-semibold text-[var(--color-text-strong)]">
            {t("invoices.all")}
          </h2>
          <button
            type="button"
            disabled
            className={cn(
              "inline-flex h-[32px] items-center gap-[6px] rounded-[6px] px-[10px]",
              "text-[12px] font-medium text-[var(--color-text-soft)]",
              "ring-1 ring-[var(--color-stroke-soft)]",
              "cursor-not-allowed opacity-50",
            )}
          >
            <RiFileDownloadLine size={14} />
            {t("invoiceList.export")}
            <RiArrowDownSLine size={14} />
          </button>
        </div>

        {sorted.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-[16px] px-[24px] py-[60px] text-center">
            <div className="text-[32px] leading-none">📄</div>
            <div className="flex flex-col gap-[6px]">
              <p className="text-[16px] font-semibold text-[var(--color-text-strong)]">
                {t("invoiceList.emptyTitle")}
              </p>
            </div>
          </div>
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[960px] text-[13px]">
              <thead>
                <tr>
                  <SortableTh col="number" currentSort={sort} currentDir={dir} onSort={handleSort}>
                    {t("invoiceList.col.id")}
                  </SortableTh>
                  <SortableTh col="client" currentSort={sort} currentDir={dir} onSort={handleSort}>
                    {t("invoiceList.col.client")}
                  </SortableTh>
                  <SortableTh col="issueDate" currentSort={sort} currentDir={dir} onSort={handleSort}>
                    {t("invoiceList.col.issueDate")}
                  </SortableTh>
                  <SortableTh col="dueOn" currentSort={sort} currentDir={dir} onSort={handleSort}>
                    {t("invoiceList.col.dueOn")}
                  </SortableTh>
                  <SortableTh col="amount" currentSort={sort} currentDir={dir} onSort={handleSort} align="right">
                    {t("invoiceList.col.amount")}
                  </SortableTh>
                  <SortableTh col="balance" currentSort={sort} currentDir={dir} onSort={handleSort} align="right">
                    {t("invoiceList.col.balance")}
                  </SortableTh>
                  <SortableTh col="status" currentSort={sort} currentDir={dir} onSort={handleSort}>
                    {t("invoiceList.col.status")}
                  </SortableTh>
                  <th className="w-[52px] px-[12px] pb-[10px]" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((inv) => {
                  const client = clientMap.get(inv.clientId);
                  const overdueDays = daysOverdue(inv);
                  const balance = computeBalance(inv);
                  return (
                    <tr
                      key={inv.id}
                      className={cn(
                        "group border-t border-[var(--color-stroke-soft)] transition-colors",
                        "hover:bg-[color-mix(in_oklab,white_2%,transparent)]",
                        "cursor-pointer",
                      )}
                      onClick={() => router.push(`/agency/invoices/${inv.id}`)}
                    >
                      {/* Invoice ID */}
                      <td
                        className="whitespace-nowrap px-[12px] py-[14px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-[8px]">
                          <Link
                            href={`/agency/invoices/${inv.id}`}
                            className="font-semibold text-[var(--color-text-strong)] hover:text-[var(--color-brand-400)]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {inv.number}
                          </Link>
                          <span className="opacity-0 transition-opacity group-hover:opacity-100">
                            <CopyIdButton value={inv.number} />
                          </span>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="whitespace-nowrap px-[12px] py-[14px]">
                        {client ? (
                          <span className="flex items-center gap-[8px]">
                            <ClientAvatar
                              initials={client.initials}
                              accentColor={client.accentColor}
                              size={26}
                            />
                            <span className="text-[var(--color-text-strong)]">
                              {client.name}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-soft)]">—</span>
                        )}
                      </td>

                      {/* Issue date */}
                      <td className="whitespace-nowrap px-[12px] py-[14px] tabular-nums text-[var(--color-text-sub)]">
                        {fmtDate(inv.issuedAt)}
                      </td>

                      {/* Due on */}
                      <td className="whitespace-nowrap px-[12px] py-[14px]">
                        <div className="flex flex-col">
                          <span className="tabular-nums text-[var(--color-text-sub)]">
                            {fmtDate(inv.dueAt)}
                          </span>
                          {overdueDays > 0 ? (
                            <span className="text-[11px] tabular-nums text-rose-400">
                              {overdueDays} {t("invoiceList.daysAgo")}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="whitespace-nowrap px-[12px] py-[14px] text-right tabular-nums font-semibold text-[var(--color-text-strong)]">
                        {usd.format(inv.totalUsd)}
                      </td>

                      {/* Balance */}
                      <td
                        className={cn(
                          "whitespace-nowrap px-[12px] py-[14px] text-right tabular-nums font-semibold",
                          inv.status === "overdue"
                            ? "text-rose-300"
                            : "text-[var(--color-text-strong)]",
                        )}
                      >
                        {usd.format(balance)}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-[12px] py-[14px]">
                        <InvoiceStatusPill status={inv.status} />
                      </td>

                      {/* Actions */}
                      <td
                        className="whitespace-nowrap px-[12px] py-[14px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RowActions invoiceId={inv.id} status={inv.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
