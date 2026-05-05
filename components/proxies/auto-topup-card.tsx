import { RiArrowRightUpLine, RiInformationLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function AutoTopupCard({ learnHref }: { learnHref: string }) {
  return (
    <section
      className={cn(
        "rounded-[12px] bg-[var(--color-bg-surface)] p-[16px] sm:p-[20px] lg:p-[24px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <header className="mb-[12px] flex items-center justify-between gap-[12px]">
        <h2 className="tp-overline text-[var(--color-brand-400)]">
          Auto top-up
        </h2>
        <a
          href={learnHref}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-[6px] text-[13px] font-semibold text-[var(--color-brand-400)] hover:text-[var(--color-brand-500)]"
        >
          Learn more
          <RiArrowRightUpLine size={14} />
        </a>
      </header>

      <div
        className={cn(
          "flex flex-col gap-[12px] rounded-[10px] p-[14px] sm:p-[16px]",
          "bg-[color-mix(in_oklab,white_2.5%,var(--color-bg-surface))]",
          "ring-1 ring-[var(--color-stroke-soft)]",
          "sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div className="flex items-start gap-[12px]">
          <span
            className={cn(
              "mt-[1px] flex size-[28px] shrink-0 items-center justify-center rounded-full",
              "bg-[color-mix(in_oklab,white_4%,transparent)] text-[var(--color-text-soft)]",
            )}
          >
            <RiInformationLine size={16} />
          </span>
          <div className="flex flex-col gap-[4px]">
            <div className="flex flex-wrap items-center gap-[8px]">
              <p className="text-[14px] font-semibold text-[var(--color-text-strong)]">
                Enable automatic top-ups
              </p>
              <span
                className={cn(
                  "rounded-[4px] px-[8px] py-[2px] text-[11px] font-medium",
                  "bg-[color-mix(in_oklab,white_6%,transparent)] text-[var(--color-text-soft)]",
                )}
              >
                Disabled
              </span>
            </div>
            <p className="text-[13px] leading-[18px] text-[var(--color-text-soft)]">
              Automatically add more data when it falls below the threshold.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="md"
          className="rounded-[8px] sm:shrink-0"
        >
          Set Up
        </Button>
      </div>
    </section>
  );
}
