"use client";

import * as React from "react";
import {
  RiUserFollowLine,
  RiFileCopyLine,
  RiCheckLine,
  RiUserAddLine,
  RiMoneyDollarCircleLine,
  RiPercentLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const STATS: {
  label: string;
  value: string;
  delta?: string;
  icon: RemixiconComponentType;
}[] = [
  { label: "Referred users", value: "12", delta: "+2 this month", icon: RiUserAddLine },
  { label: "Total earnings", value: "$184.00", delta: "+$36 this month", icon: RiMoneyDollarCircleLine },
  { label: "Commission rate", value: "20%", icon: RiPercentLine },
];

const HISTORY = [
  { user: "lukas***@proton.me", date: "2026-04-28", plan: "Residential 50 GB", commission: "$10.00" },
  { user: "tom***@gmail.com", date: "2026-04-22", plan: "ISP 10 proxies", commission: "$24.00" },
  { user: "ana***@outlook.com", date: "2026-04-19", plan: "Datacenter 25 proxies", commission: "$13.90" },
  { user: "marc***@protonmail.com", date: "2026-04-11", plan: "Residential 10 GB", commission: "$2.00" },
];

export default function ReferralPage() {
  const [copied, setCopied] = React.useState(false);
  const code = "IPRROYAL-DICT2026";
  const link = `https://iproyal.com/?ref=${code}`;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  return (
    <AppShell>
      <div className="flex items-center gap-[14px]">
        <span
          className={cn(
            "flex size-[44px] shrink-0 items-center justify-center rounded-full",
            "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
          )}
        >
          <RiUserFollowLine size={20} />
        </span>
        <div className="flex flex-col">
          <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
            Referral program
          </h1>
          <p className="mt-[2px] text-[13px] text-[var(--color-text-soft)]">
            Invite friends, earn 20% recurring on every plan they buy.
          </p>
        </div>
      </div>

      <section
        className={cn(
          "enter-stagger mt-[24px] grid gap-[16px] sm:grid-cols-3",
        )}
      >
        {STATS.map((s) => (
          <article
            key={s.label}
            className={cn(
              "flex items-start gap-[14px] rounded-[12px] p-[20px]",
              "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
            )}
          >
            <span
              className={cn(
                "flex size-[40px] shrink-0 items-center justify-center rounded-full",
                "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
              )}
            >
              <s.icon size={20} />
            </span>
            <div className="flex flex-col gap-[2px]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
                {s.label}
              </p>
              <p className="text-[24px] font-semibold leading-[30px] tabular-nums text-[var(--color-text-strong)]">
                {s.value}
              </p>
              {s.delta ? (
                <p className="text-[12px] text-[var(--color-brand-400)]">
                  {s.delta}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section
        className={cn(
          "mt-[20px] grid gap-[16px] rounded-[12px] p-[20px] sm:p-[24px]",
          "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
          "lg:grid-cols-2",
        )}
      >
        <ShareField
          label="Your referral code"
          value={code}
          onCopy={() => copy(code)}
          copied={copied}
        />
        <ShareField
          label="Your referral link"
          value={link}
          onCopy={() => copy(link)}
          copied={copied}
        />
      </section>

      <section
        className={cn(
          "mt-[20px] rounded-[12px] p-[16px] sm:p-[20px] lg:p-[24px]",
          "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
        )}
      >
        <header className="mb-[16px] flex items-center justify-between gap-[12px]">
          <h2 className="tp-overline text-[var(--color-brand-400)]">
            Recent commissions
          </h2>
          <Button variant="outline" size="sm" className="rounded-[8px]">
            Withdraw earnings
          </Button>
        </header>

        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
                <th className="px-[12px] pb-[10px] font-semibold">User</th>
                <th className="px-[12px] pb-[10px] font-semibold">Date</th>
                <th className="px-[12px] pb-[10px] font-semibold">Plan</th>
                <th className="px-[12px] pb-[10px] text-right font-semibold">
                  Commission
                </th>
              </tr>
            </thead>
            <tbody>
              {HISTORY.map((h) => (
                <tr
                  key={h.user + h.date}
                  className="border-t border-[var(--color-stroke-soft)]"
                >
                  <td className="px-[12px] py-[12px] font-semibold text-[var(--color-text-strong)]">
                    {h.user}
                  </td>
                  <td className="px-[12px] py-[12px] text-[var(--color-text-sub)] tabular-nums">
                    {h.date}
                  </td>
                  <td className="px-[12px] py-[12px] text-[var(--color-text-sub)]">
                    {h.plan}
                  </td>
                  <td className="px-[12px] py-[12px] text-right font-semibold tabular-nums text-[var(--color-brand-400)]">
                    {h.commission}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function ShareField({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <label className="flex flex-col gap-[8px]">
      <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
        {label}
      </span>
      <div
        className={cn(
          "flex h-[48px] items-center gap-[8px] rounded-[10px] px-[14px]",
          "bg-[color-mix(in_oklab,white_2.5%,var(--color-bg-surface))]",
          "ring-1 ring-[var(--color-stroke-soft)]",
        )}
      >
        <span className="flex-1 truncate text-[14px] text-[var(--color-text-strong)] tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy"
          className={cn(
            "flex size-[32px] items-center justify-center rounded-[6px]",
            "text-[var(--color-text-soft)] hover:bg-white/5 hover:text-[var(--color-text-strong)]",
            "transition-colors",
          )}
        >
          {copied ? (
            <RiCheckLine size={16} className="text-[var(--color-brand-400)]" />
          ) : (
            <RiFileCopyLine size={16} />
          )}
        </button>
      </div>
    </label>
  );
}
