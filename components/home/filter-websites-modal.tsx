"use client";

import * as React from "react";
import {
  RiSearchLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from "@remixicon/react";
import { cn } from "@/lib/cn";
import { Modal, ModalCloseButton } from "@/components/ui/modal";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterWebsitesModalProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  items: string[];
  value: string[];
  onChange: (next: string[]) => void;
};

const PAGE_SIZES = [5, 10, 25, 50];

export function FilterWebsitesModal({
  open,
  onOpenChange,
  items,
  value,
  onChange,
}: FilterWebsitesModalProps) {
  // Working copy — we commit on Save
  const [draft, setDraft] = React.useState<Set<string>>(new Set(value));
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<number>(5);

  // Sync draft whenever modal opens
  React.useEffect(() => {
    if (open) {
      setDraft(new Set(value));
      setQuery("");
      setPage(1);
    }
  }, [open, value]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.toLowerCase().includes(q));
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  const pageAllSelected =
    pageItems.length > 0 && pageItems.every((i) => draft.has(i));
  const pageSomeSelected =
    !pageAllSelected && pageItems.some((i) => draft.has(i));

  const togglePageAll = () => {
    const next = new Set(draft);
    if (pageAllSelected) {
      for (const i of pageItems) next.delete(i);
    } else {
      for (const i of pageItems) next.add(i);
    }
    setDraft(next);
  };

  const toggleOne = (name: string) => {
    const next = new Set(draft);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setDraft(next);
  };

  const clearAll = () => setDraft(new Set());

  const save = () => {
    onChange(Array.from(draft));
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel="Filter websites"
      width={620}
    >
      <ModalCloseButton onClick={() => onOpenChange(false)} />

      <div className="flex min-h-0 flex-col px-[24px] pt-[28px] sm:px-[40px] sm:pt-[40px]">
        <h2 className="tp-headline-m mb-[16px] text-[var(--color-text-strong)] sm:mb-[20px]">
          Filter websites
        </h2>

        {/* Search */}
        <div
          className={cn(
            "relative flex h-[40px] items-center rounded-[8px]",
            "bg-[var(--color-bg-app)]",
            "ring-1 ring-[var(--color-stroke-soft)]",
            "focus-within:ring-2 focus-within:ring-[var(--color-brand-400)]",
            "transition-[box-shadow] duration-150",
          )}
        >
          <input
            type="text"
            placeholder="Search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className={cn(
              "h-full w-full bg-transparent px-[16px] pr-[44px] text-[14px] leading-[20px]",
              "text-[var(--color-text-strong)] placeholder:text-[var(--color-text-soft)]",
              "outline-none",
            )}
          />
          <RiSearchLine
            size={18}
            className="pointer-events-none absolute right-[14px] text-[var(--color-text-soft)]"
          />
        </div>

        {/* List box */}
        <div
          className={cn(
            "mt-[16px] flex min-h-0 flex-1 flex-col overflow-hidden rounded-[8px]",
            "ring-1 ring-[var(--color-stroke-soft)]",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between gap-[12px]",
              "px-[16px] py-[12px]",
              "border-b border-[var(--color-stroke-soft)]",
            )}
          >
            <label className="flex cursor-pointer items-center gap-[12px] text-[14px] leading-[20px] text-[var(--color-text-strong)]">
              <Checkbox
                checked={pageAllSelected}
                indeterminate={pageSomeSelected}
                onCheckedChange={togglePageAll}
                aria-label="Select all on this page"
              />
              <span>Select all</span>
            </label>
            <button
              type="button"
              onClick={clearAll}
              className={cn(
                "text-[14px] font-semibold leading-[20px]",
                "text-[var(--color-brand-400)] transition-colors",
                "hover:text-[var(--color-brand-500)]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
              disabled={draft.size === 0}
            >
              Clear All
            </button>
          </div>

          <ul
            className="scrollbar-thin flex-1 overflow-y-auto"
            aria-label="Websites"
          >
            {pageItems.length === 0 ? (
              <li className="px-[16px] py-[24px] text-center text-[13px] text-[var(--color-text-soft)]">
                No matches found.
              </li>
            ) : (
              pageItems.map((item, idx) => {
                const checked = draft.has(item);
                return (
                  <li
                    key={item}
                    className={cn(
                      idx > 0 && "border-t border-[var(--color-stroke-soft)]",
                    )}
                  >
                    <label
                      className={cn(
                        "group flex cursor-pointer items-center gap-[12px]",
                        "px-[16px] py-[12px]",
                        "text-[14px] leading-[20px] text-[var(--color-text-strong)]",
                        "transition-colors",
                        "hover:bg-[color-mix(in_oklab,white_3%,transparent)]",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleOne(item)}
                        aria-label={item}
                      />
                      <span className="truncate">{item}</span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* Pagination */}
        <div className="mt-[16px] flex flex-wrap items-center justify-between gap-[12px]">
          <div className="w-[140px]">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-[40px]">
                <SelectValue>{pageSize} per page</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s} per page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-[8px]">
            <PagerButton
              aria-label="Previous page"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <RiArrowLeftSLine size={18} />
            </PagerButton>
            <PageNumberInput
              value={safePage}
              max={totalPages}
              onCommit={setPage}
            />
            <span className="text-[13px] text-[var(--color-text-soft)]">
              of {totalPages}
            </span>
            <PagerButton
              aria-label="Next page"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <RiArrowRightSLine size={18} />
            </PagerButton>
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div
        className={cn(
          "mt-[20px] grid grid-cols-2 gap-[12px]",
          "px-[24px] pb-[24px] sm:px-[40px] sm:pb-[40px]",
        )}
      >
        <button
          type="button"
          onClick={save}
          className={cn(
            "inline-flex h-[48px] items-center justify-center whitespace-nowrap rounded-[8px]",
            "bg-[var(--color-brand-400)] text-[#232323]",
            "text-[16px] font-semibold leading-[20px]",
            "transition-[background-color,scale] duration-150",
            "hover:bg-[var(--color-brand-500)]",
            "active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:shadow-[var(--shadow-button-brand-focus)]",
          )}
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className={cn(
            "inline-flex h-[48px] items-center justify-center whitespace-nowrap rounded-[8px]",
            "border border-[var(--color-brand-400)] bg-transparent",
            "text-[16px] font-semibold leading-[20px] text-[var(--color-brand-400)]",
            "transition-[background-color,scale] duration-150",
            "hover:bg-[color-mix(in_oklab,var(--color-brand-400)_10%,transparent)]",
            "active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:shadow-[var(--shadow-button-brand-focus)]",
          )}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}

function PagerButton({
  children,
  disabled,
  onClick,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex size-[36px] items-center justify-center rounded-[8px]",
        "border border-[var(--color-stroke-soft)] bg-transparent",
        "text-[var(--color-text-sub)]",
        "transition-[background-color,border-color,color] duration-150",
        "hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-400)]",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--color-stroke-soft)] disabled:hover:text-[var(--color-text-sub)]",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

function PageNumberInput({
  value,
  max,
  onCommit,
}: {
  value: number;
  max: number;
  onCommit: (n: number) => void;
}) {
  const [local, setLocal] = React.useState(String(value));
  React.useEffect(() => setLocal(String(value)), [value]);

  const commit = () => {
    const n = parseInt(local, 10);
    if (Number.isFinite(n)) {
      const clamped = Math.max(1, Math.min(max, n));
      onCommit(clamped);
      setLocal(String(clamped));
    } else {
      setLocal(String(value));
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={local}
      onChange={(e) => setLocal(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn(
        "h-[36px] w-[52px] rounded-[8px] bg-transparent text-center",
        "border border-[var(--color-stroke-soft)]",
        "text-[14px] leading-[20px] text-[var(--color-text-strong)] tabular-nums",
        "outline-none",
        "focus:border-[var(--color-brand-400)]",
      )}
    />
  );
}
