import * as React from "react";
import { type RemixiconComponentType } from "@remixicon/react";
import { RiCheckLine } from "@remixicon/react";
import { cn } from "@/lib/cn";
import { GlowCTA } from "@/components/ui/glow-cta";

export interface ProductCardProps {
  title: string;
  pricing: string;
  icon: RemixiconComponentType;
  accent?: "teal" | "orange" | "blue" | "green" | "rose" | "purple";
  bullets: string[];
  ctaLabel?: string;
  ctaHref?: string;
}

const accentMap: Record<
  NonNullable<ProductCardProps["accent"]>,
  { bg: string; fg: string; price: string }
> = {
  teal: {
    bg: "bg-[var(--color-brand-100)]",
    fg: "text-[var(--color-brand-400)]",
    price: "text-[var(--color-brand-400)]",
  },
  orange: {
    bg: "bg-[color-mix(in_oklab,#d46804_22%,#232323)]",
    fg: "text-[#f59e3b]",
    price: "text-[#f59e3b]",
  },
  blue: {
    bg: "bg-[color-mix(in_oklab,#4a6bff_22%,#232323)]",
    fg: "text-[#7a9bff]",
    price: "text-[#7a9bff]",
  },
  green: {
    bg: "bg-[color-mix(in_oklab,#22c55e_22%,#232323)]",
    fg: "text-[#4ade80]",
    price: "text-[#4ade80]",
  },
  rose: {
    bg: "bg-[color-mix(in_oklab,#f43f5e_22%,#232323)]",
    fg: "text-[#fb7185]",
    price: "text-[#fb7185]",
  },
  purple: {
    bg: "bg-[color-mix(in_oklab,#a78bfa_22%,#232323)]",
    fg: "text-[#c4b5fd]",
    price: "text-[#c4b5fd]",
  },
};

export function ProductCard({
  title,
  pricing,
  icon: Icon,
  accent = "teal",
  bullets,
  ctaLabel = "Buy Now",
  ctaHref = "#",
}: ProductCardProps) {
  const a = accentMap[accent];

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-[14px] rounded-[12px] sm:gap-[16px]",
        "bg-[var(--color-bg-surface)] p-[18px] sm:p-[20px] lg:p-[24px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
        "transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-spring)]",
        "hover:-translate-y-[2px] hover:ring-[var(--color-stroke-sub)] hover:shadow-[var(--shadow-regular-md)]",
        "active:translate-y-0 active:shadow-none",
      )}
    >
      <header className="flex items-start gap-[12px]">
        <span
          className={cn(
            "flex size-[40px] shrink-0 items-center justify-center rounded-full",
            a.bg,
            a.fg,
            "transition-transform duration-300 ease-[var(--ease-soft-spring)]",
            "group-hover:scale-[1.08] group-hover:-rotate-[6deg]",
          )}
        >
          <Icon
            size={20}
            className="transition-transform duration-400 ease-[var(--ease-spring)] group-hover:rotate-[6deg]"
          />
        </span>
        <div className="flex min-w-0 flex-col gap-[2px]">
          <h3 className="text-[18px] font-bold leading-[22px] text-balance">
            {title}
          </h3>
          <p
            className={cn(
              "text-[13px] font-semibold leading-[18px] tabular-nums",
              a.price,
            )}
          >
            {pricing}
          </p>
        </div>
      </header>

      <ul className="flex flex-col gap-[10px]">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-[10px] text-[13px] leading-[20px] text-[var(--color-text-sub)]"
          >
            <span className="mt-[2px] flex size-[16px] shrink-0 items-center justify-center rounded-full text-[var(--color-brand-400)]">
              <RiCheckLine size={14} />
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <GlowCTA href={ctaHref} className="mt-auto">
        {ctaLabel}
      </GlowCTA>
    </article>
  );
}
