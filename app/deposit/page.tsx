"use client";

import * as React from "react";
import {
  RiBankCardLine,
  RiBitCoinLine,
  RiPaypalLine,
  RiGoogleLine,
  RiAlipayLine,
  RiAddLine,
  RiCheckLine,
  RiArrowDownSLine,
  RiInformationLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Method = {
  id: string;
  label: string;
  icon: RemixiconComponentType;
  meta?: React.ReactNode;
};

const METHODS: Method[] = [
  {
    id: "card",
    label: "Credit or debit card",
    icon: RiBankCardLine,
    meta: (
      <span className="flex items-center gap-[6px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
        <CardBadge>Visa</CardBadge>
        <CardBadge>MC</CardBadge>
        <CardBadge>Amex</CardBadge>
        <CardBadge>Disc</CardBadge>
      </span>
    ),
  },
  {
    id: "crypto",
    label: "Crypto",
    icon: RiBitCoinLine,
    meta: (
      <span className="text-[12px] font-semibold text-[var(--color-text-soft)]">
        25+ crypto
      </span>
    ),
  },
  { id: "paypal", label: "PayPal", icon: RiPaypalLine },
  { id: "gpay", label: "Google Pay", icon: RiGoogleLine },
  { id: "alipay", label: "Alipay", icon: RiAlipayLine },
];

const SAVED_CARDS = [{ id: "card-7386", brand: "visa", last4: "7386" }];

export default function DepositPage() {
  const [method, setMethod] = React.useState("card");
  const [card, setCard] = React.useState(SAVED_CARDS[0]?.id ?? "");
  const [amount, setAmount] = React.useState("20");
  const [historyOpen, setHistoryOpen] = React.useState(false);

  const numericAmount = Math.max(0, Number(amount) || 0);

  return (
    <AppShell>
      <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
        Make a deposit
      </h1>

      <div className="enter-stagger mt-[20px] grid gap-[16px] sm:mt-[24px] sm:gap-[20px] lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <section
          className={cn(
            "rounded-[12px] bg-[var(--color-bg-surface)] p-[16px] sm:p-[20px] lg:p-[24px]",
            "ring-1 ring-[var(--color-stroke-soft)]",
          )}
        >
          <header className="mb-[16px]">
            <h2 className="tp-overline text-[var(--color-brand-400)]">
              Deposit method
            </h2>
          </header>

          <ul className="flex flex-col gap-[10px]">
            {METHODS.map((m) => {
              const active = method === m.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setMethod(m.id)}
                    aria-pressed={active}
                    className={cn(
                      "group flex w-full items-center gap-[14px] rounded-[10px] px-[14px] py-[14px] text-left",
                      "ring-1 transition-[box-shadow,background-color]",
                      active
                        ? "bg-[color-mix(in_oklab,var(--color-brand-400)_10%,var(--color-bg-surface))] ring-[var(--color-brand-400)]"
                        : "bg-[color-mix(in_oklab,white_2.5%,var(--color-bg-surface))] ring-[var(--color-stroke-soft)] hover:ring-[var(--color-stroke-sub)]",
                    )}
                  >
                    <Radio active={active} />
                    <span
                      className={cn(
                        "flex size-[28px] shrink-0 items-center justify-center rounded-[6px]",
                        "bg-[color-mix(in_oklab,white_4%,transparent)] text-[var(--color-text-strong)]",
                      )}
                    >
                      <m.icon size={16} />
                    </span>
                    <span className="flex-1 text-[14px] font-semibold text-[var(--color-text-strong)]">
                      {m.label}
                    </span>
                    {m.meta}
                  </button>

                  {active && m.id === "card" ? (
                    <div className="mt-[10px] grid gap-[10px] sm:grid-cols-2">
                      {SAVED_CARDS.map((c) => {
                        const sel = card === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setCard(c.id)}
                            aria-pressed={sel}
                            className={cn(
                              "flex h-[64px] items-center gap-[10px] rounded-[10px] px-[14px] text-left",
                              "ring-1 transition-[box-shadow,background-color]",
                              sel
                                ? "bg-[color-mix(in_oklab,var(--color-brand-400)_10%,var(--color-bg-surface))] ring-[var(--color-brand-400)]"
                                : "bg-[color-mix(in_oklab,white_2.5%,var(--color-bg-surface))] ring-[var(--color-stroke-soft)] hover:ring-[var(--color-stroke-sub)]",
                            )}
                          >
                            <RiBankCardLine
                              size={20}
                              className={cn(
                                sel
                                  ? "text-[var(--color-brand-400)]"
                                  : "text-[var(--color-text-soft)]",
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
                                {c.brand}
                              </span>
                              <span className="text-[14px] font-semibold tabular-nums text-[var(--color-text-strong)]">
                                ••••{c.last4}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        className={cn(
                          "flex h-[64px] items-center justify-center gap-[8px] rounded-[10px] border border-dashed",
                          "border-[var(--color-stroke-sub)] bg-transparent",
                          "text-[13px] font-semibold text-[var(--color-text-sub)]",
                          "transition-colors hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-400)]",
                        )}
                      >
                        <RiAddLine size={16} />
                        Add new card
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            className={cn(
              "mt-[20px] flex w-full items-center justify-between gap-[12px] rounded-[10px] px-[14px] py-[14px]",
              "bg-[color-mix(in_oklab,white_2.5%,var(--color-bg-surface))]",
              "ring-1 ring-[var(--color-stroke-soft)] hover:ring-[var(--color-stroke-sub)]",
              "transition-[box-shadow]",
            )}
          >
            <span className="tp-overline text-[var(--color-brand-400)]">
              Your latest deposits
            </span>
            <RiArrowDownSLine
              size={18}
              className={cn(
                "text-[var(--color-text-soft)] transition-transform duration-300",
                historyOpen && "rotate-180",
              )}
            />
          </button>
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-300",
              historyOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              <p className="px-[14px] py-[16px] text-[13px] text-[var(--color-text-soft)]">
                No deposits yet — your history will appear here.
              </p>
            </div>
          </div>
        </section>

        {/* Right summary */}
        <aside
          className={cn(
            "h-fit rounded-[12px] bg-[var(--color-bg-surface)] p-[20px] lg:p-[24px]",
            "ring-1 ring-[var(--color-stroke-soft)]",
            "lg:sticky lg:top-[88px]",
          )}
        >
          <h2 className="text-[18px] font-semibold leading-[24px]">
            Complete deposit
          </h2>

          <label className="mt-[16px] flex flex-col gap-[8px]">
            <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
              Amount
            </span>
            <div
              className={cn(
                "flex h-[44px] items-center rounded-[8px] px-[14px]",
                "bg-[color-mix(in_oklab,white_2.5%,var(--color-bg-surface))]",
                "ring-1 ring-[var(--color-stroke-soft)]",
                "focus-within:ring-2 focus-within:ring-[var(--color-brand-400)]",
              )}
            >
              <input
                type="number"
                min={10}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-transparent text-[14px] tabular-nums text-[var(--color-text-strong)] outline-none"
              />
              <span className="text-[12px] font-semibold text-[var(--color-text-soft)]">
                USD
              </span>
            </div>
            <span className="inline-flex items-center gap-[6px] text-[12px] text-[var(--color-text-soft)]">
              <RiInformationLine size={12} />
              Minimum amount is 10 USD
            </span>
          </label>

          <div className="mt-[20px] flex items-baseline justify-between gap-[8px] border-t border-[var(--color-stroke-soft)] pt-[16px]">
            <span className="text-[13px] text-[var(--color-text-soft)]">
              Amount
            </span>
            <span className="text-[28px] font-semibold leading-[32px] tabular-nums text-[var(--color-text-strong)]">
              ${numericAmount.toFixed(2)}
            </span>
          </div>

          <ul className="mt-[16px] flex flex-col gap-[8px]">
            {[
              "Deposits Never Expire",
              "Use Anytime",
              "No Commitment",
            ].map((p) => (
              <li
                key={p}
                className="flex items-center gap-[10px] text-[13px] text-[var(--color-text-strong)]"
              >
                <span
                  className={cn(
                    "flex size-[20px] items-center justify-center rounded-full",
                    "bg-[color-mix(in_oklab,var(--color-brand-400)_18%,transparent)]",
                    "text-[var(--color-brand-400)]",
                  )}
                >
                  <RiCheckLine size={12} />
                </span>
                {p}
              </li>
            ))}
          </ul>

          <Button
            variant="primary-orange"
            size="lg"
            className="mt-[20px] w-full rounded-[8px]"
          >
            Deposit
          </Button>
        </aside>
      </div>
    </AppShell>
  );
}

function Radio({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "relative flex size-[18px] shrink-0 items-center justify-center rounded-full",
        active
          ? "bg-[var(--color-brand-400)]"
          : "ring-2 ring-inset ring-[var(--color-stroke-strong)]",
      )}
    >
      {active ? (
        <span className="size-[6px] rounded-full bg-[var(--color-bg-surface)]" />
      ) : null}
    </span>
  );
}

function CardBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-[20px] items-center rounded-[4px] px-[6px]",
        "bg-[color-mix(in_oklab,white_4%,transparent)]",
        "ring-1 ring-[var(--color-stroke-soft)]",
        "text-[var(--color-text-soft)]",
      )}
    >
      {children}
    </span>
  );
}
