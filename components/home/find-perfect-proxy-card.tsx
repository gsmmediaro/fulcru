import * as React from "react";
import { RiGlobalLine } from "@remixicon/react";
import { cn } from "@/lib/cn";
import { GlowCTA } from "@/components/ui/glow-cta";

export function FindPerfectProxyCard() {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-[14px] rounded-[12px] p-[18px] sm:gap-[16px] sm:p-[20px] lg:p-[24px]",
        "bg-[var(--color-brand-100)]",
        "ring-1 ring-[color-mix(in_oklab,var(--color-brand-400)_25%,transparent)]",
        "transition-[box-shadow,outline-width,transform] duration-200",
        "hover:-translate-y-[2px] hover:shadow-[var(--shadow-regular-md)]",
        "hover:ring-[color-mix(in_oklab,var(--color-brand-400)_55%,transparent)]",
        "relative overflow-hidden",
      )}
    >
      {/* subtle globe accent — drifts brighter on hover */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-[20px] -top-[20px] size-[160px] rounded-full opacity-[0.08] blur-[2px]",
          "transition-[opacity,transform] duration-[700ms] ease-[var(--ease-out-expo)]",
          "group-hover:opacity-[0.18] group-hover:scale-[1.15]",
        )}
        style={{
          background:
            "radial-gradient(closest-side, var(--color-brand-400), transparent 70%)",
        }}
      />

      <header className="flex items-start gap-[12px]">
        <span
          className={cn(
            "flex size-[40px] shrink-0 items-center justify-center rounded-full",
            "bg-[color-mix(in_oklab,var(--color-brand-400)_20%,transparent)]",
            "text-[var(--color-brand-400)]",
            "transition-transform duration-[1200ms] ease-[var(--ease-out-expo)]",
            "group-hover:rotate-[40deg]",
          )}
        >
          <RiGlobalLine size={20} />
        </span>
        <h3 className="text-[18px] font-bold leading-[22px]">
          Find the perfect proxy in under a minute
        </h3>
      </header>

      <p className="text-[13px] leading-[20px] text-[var(--color-text-sub)]">
        Answer a few short questions and we&apos;ll match you with the proxy
        type that saves you time, money, and trial-and-error.
      </p>

      <GlowCTA href="#" variant="outline" className="mt-auto">
        Find my perfect proxy
      </GlowCTA>
    </article>
  );
}
