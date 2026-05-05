"use client";

import * as React from "react";
import {
  RiArrowDownSLine,
  RiRefreshLine,
  RiTimerLine,
  RiKey2Line,
  RiGlobalLine,
  RiStackLine,
  RiSparklingLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { cn } from "@/lib/cn";

type Feature = {
  title: string;
  description: string;
  icon: RemixiconComponentType;
};

const FEATURES: Feature[] = [
  {
    title: "Instant IP Change (Randomize Option)",
    description:
      "Change your IP via the dashboard with a simple click/tap of a button or via an API request. Get a new IP whenever you need one.",
    icon: RiRefreshLine,
  },
  {
    title: "Auto-Rotate (Sticky Option)",
    description:
      "Customize your sessions with our Sticky IP option. Specify how often you wish to switch to a new proxy.",
    icon: RiTimerLine,
  },
  {
    title: "Easy User Authentication",
    description:
      "Use the standard username and password or whitelist your IPs for seamless authentication.",
    icon: RiKey2Line,
  },
  {
    title: "Unique Residential IPs",
    description:
      "Get fresh, real residential IPs from our residential proxies pool with genuine devices and residential connections.",
    icon: RiGlobalLine,
  },
  {
    title: "Unlimited concurrent sessions",
    description:
      "No limits and restrictions – send an unlimited amount of concurrent sessions.",
    icon: RiStackLine,
  },
  {
    title: "High-End Pool",
    description:
      "Get only the fastest IPs from the residential proxy pool with a single click in the dashboard.",
    icon: RiSparklingLine,
  },
];

export function FeaturesAccordion() {
  const [open, setOpen] = React.useState(false);

  return (
    <section
      className={cn(
        "rounded-[12px] bg-[var(--color-bg-surface)]",
        "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-[12px]",
          "px-[16px] py-[16px] sm:px-[20px] lg:px-[24px]",
          "rounded-[12px] outline-none cursor-pointer",
          "focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
        )}
      >
        <h2 className="tp-overline text-[var(--color-brand-400)]">Features</h2>
        <RiArrowDownSLine
          size={20}
          className={cn(
            "text-[var(--color-text-soft)] transition-transform duration-300 ease-[var(--ease-spring)]",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ul
            className={cn(
              "grid gap-[12px] px-[16px] pb-[20px] sm:px-[20px] sm:pb-[24px] lg:px-[24px]",
              "sm:grid-cols-2 lg:grid-cols-3",
            )}
          >
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className={cn(
                  "flex flex-col gap-[8px] rounded-[10px] p-[14px]",
                  "bg-[color-mix(in_oklab,white_2.5%,var(--color-bg-surface))]",
                  "ring-1 ring-[var(--color-stroke-soft)]",
                )}
              >
                <span
                  className={cn(
                    "flex size-[32px] items-center justify-center rounded-full",
                    "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
                  )}
                >
                  <f.icon size={16} />
                </span>
                <p className="text-[13px] font-semibold leading-[18px] text-[var(--color-text-strong)]">
                  {f.title}
                </p>
                <p className="text-[12px] leading-[18px] text-[var(--color-text-soft)]">
                  {f.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
