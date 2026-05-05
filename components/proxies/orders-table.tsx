"use client";

import * as React from "react";
import {
  RiSearchLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiMoreLine,
  RiSettings4Line,
} from "@remixicon/react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Order = {
  id: string;
  quantity: number;
  date: string;
  time: string;
  price: string;
  status: "Active" | "Expired";
  trafficBefore: string;
  note?: string;
};

const ORDERS: Order[] = [
  {
    id: "#71272828",
    quantity: 1,
    date: "2026-05-01",
    time: "11:19",
    price: "$7.00",
    status: "Active",
    trafficBefore: "0.02 GB",
  },
  {
    id: "#70548630",
    quantity: 1,
    date: "2026-04-21",
    time: "10:47",
    price: "$7.00",
    status: "Active",
    trafficBefore: "1 GB",
  },
  {
    id: "#70545641",
    quantity: 1,
    date: "2026-04-21",
    time: "09:45",
    price: "$7.00",
    status: "Active",
    trafficBefore: "0",
  },
  {
    id: "#70140029",
    quantity: 1,
    date: "2026-04-15",
    time: "16:50",
    price: "$7.00",
    status: "Active",
    trafficBefore: "0.54 GB",
  },
  {
    id: "#70053370",
    quantity: 1,
    date: "2026-04-14",
    time: "11:23",
    price: "$7.00",
    status: "Active",
    trafficBefore: "0.12 GB",
  },
];

export function OrdersTable({ title = "Residential orders" }: { title?: string }) {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("All");

  const filtered = ORDERS.filter((o) => {
    const q = search.trim().toLowerCase();
    if (q && !o.id.toLowerCase().includes(q) && !(o.note ?? "").toLowerCase().includes(q))
      return false;
    if (status !== "All" && o.status !== status) return false;
    return true;
  });

  return (
    <section
      className={cn(
        "rounded-[12px] bg-[var(--color-bg-surface)] p-[16px] sm:p-[20px] lg:p-[24px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <header className="mb-[16px]">
        <h2 className="tp-overline text-[var(--color-brand-400)]">{title}</h2>
      </header>

      <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-[minmax(0,1fr)_minmax(0,200px)]">
        <Field label="Search by note or ID">
          <div
            className={cn(
              "flex h-[44px] items-center gap-[8px] rounded-[8px] px-[14px]",
              "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
              "hover:ring-[var(--color-stroke-sub)]",
              "focus-within:ring-2 focus-within:ring-[var(--color-brand-400)]",
            )}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent text-[14px] text-[var(--color-text-strong)] outline-none placeholder:text-[var(--color-text-soft)]"
            />
            <RiSearchLine size={16} className="text-[var(--color-text-soft)]" />
          </div>
        </Field>
        <Field label="Status">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="scrollbar-thin mt-[20px] overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead>
            <tr className="text-left text-[12px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
              <Th sortable active>ID</Th>
              <Th>Quantity</Th>
              <Th>
                Order date <span className="ml-[4px] text-[10px] normal-case tracking-normal text-[var(--color-text-disabled)]">GMT+3</span>
              </Th>
              <Th>Price</Th>
              <Th>Status</Th>
              <Th>Traffic before order</Th>
              <Th>Note</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr
                key={o.id}
                className={cn(
                  "border-t border-[var(--color-stroke-soft)] transition-colors",
                  "hover:bg-[color-mix(in_oklab,white_2%,transparent)]",
                )}
              >
                <Td className="font-semibold text-[var(--color-text-strong)]">
                  {o.id}
                </Td>
                <Td>{o.quantity}</Td>
                <Td>
                  <div className="flex flex-col">
                    <span className="text-[var(--color-text-strong)]">
                      {o.date}
                    </span>
                    <span className="text-[12px] text-[var(--color-text-soft)]">
                      {o.time}
                    </span>
                  </div>
                </Td>
                <Td className="font-semibold text-[var(--color-text-strong)] tabular-nums">
                  {o.price}
                </Td>
                <Td>
                  <span
                    className={cn(
                      "inline-flex rounded-[4px] px-[8px] py-[2px] text-[11px] font-semibold",
                      o.status === "Active"
                        ? "bg-[color-mix(in_oklab,var(--color-accent-green)_18%,transparent)] text-emerald-300"
                        : "bg-[color-mix(in_oklab,white_6%,transparent)] text-[var(--color-text-soft)]",
                    )}
                  >
                    {o.status}
                  </span>
                </Td>
                <Td className="tabular-nums">{o.trafficBefore}</Td>
                <Td className="text-[var(--color-text-soft)]">
                  {o.note ?? "-"}
                </Td>
                <Td>
                  <button
                    type="button"
                    aria-label="Row actions"
                    className={cn(
                      "flex size-[28px] items-center justify-center rounded-[6px]",
                      "text-[var(--color-text-soft)] hover:bg-white/5 hover:text-[var(--color-text-strong)]",
                    )}
                  >
                    <RiMoreLine size={16} />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="mt-[16px] flex flex-wrap items-center justify-between gap-[12px]">
        <Button
          variant="outline"
          size="sm"
          className="rounded-[8px]"
          leadingIcon={<RiSettings4Line size={14} />}
        >
          Customize table
        </Button>

        <div className="flex flex-wrap items-center gap-[12px]">
          <Select value="5" onValueChange={() => {}}>
            <SelectTrigger className="!h-[36px] !w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 per page</SelectItem>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="20">20 per page</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[12px] text-[var(--color-text-soft)]">
            <span className="text-[var(--color-text-strong)]">1-{filtered.length}</span> of 8
          </span>
          <div className="flex items-center gap-[4px]">
            <PageBtn active>1</PageBtn>
            <PageBtn>2</PageBtn>
          </div>
        </div>
      </footer>
    </section>
  );
}

function Th({
  children,
  sortable,
  active,
}: {
  children: React.ReactNode;
  sortable?: boolean;
  active?: boolean;
}) {
  return (
    <th className="whitespace-nowrap px-[12px] pb-[10px] font-semibold">
      <span className="inline-flex items-center gap-[4px]">
        {children}
        {sortable ? (
          active ? (
            <RiArrowDownLine
              size={12}
              className="text-[var(--color-brand-400)]"
            />
          ) : (
            <RiArrowUpLine
              size={12}
              className="text-[var(--color-text-disabled)]"
            />
          )
        ) : null}
      </span>
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-[12px] py-[14px] text-[var(--color-text-sub)]",
        className,
      )}
    >
      {children}
    </td>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[8px]">
      <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function PageBtn({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-[28px] items-center justify-center rounded-[6px] text-[12px] font-semibold transition-colors",
        active
          ? "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]"
          : "text-[var(--color-text-soft)] hover:bg-white/5 hover:text-[var(--color-text-strong)]",
      )}
    >
      {children}
    </button>
  );
}
