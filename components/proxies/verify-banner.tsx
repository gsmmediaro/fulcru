import { RiCheckLine, RiShieldCheckLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const PERKS = [
  "Bigger pool",
  "Access to restricted content",
  "Option to buy unlimited traffic/IPs",
];

export function VerifyBanner({ href }: { href: string }) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[12px] p-[20px] sm:p-[24px]",
        "bg-[color-mix(in_oklab,var(--color-brand-400)_24%,var(--color-bg-surface))]",
        "ring-1 ring-[color-mix(in_oklab,var(--color-brand-400)_30%,transparent)]",
      )}
    >
      <RiShieldCheckLine
        aria-hidden
        size={220}
        className={cn(
          "pointer-events-none absolute -right-[24px] top-1/2 -translate-y-1/2",
          "text-[color-mix(in_oklab,var(--color-brand-400)_38%,transparent)]",
        )}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-[16px]">
        <div className="flex flex-col gap-[10px]">
          <p className="text-[15px] font-semibold text-[var(--color-text-strong)]">
            Verify your identity and get extras:
          </p>
          <ul className="flex flex-col gap-[6px]">
            {PERKS.map((p) => (
              <li
                key={p}
                className="flex items-center gap-[8px] text-[13px] text-[var(--color-text-strong)]"
              >
                <RiCheckLine
                  size={14}
                  className="text-[var(--color-brand-400)]"
                />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <Button variant="primary" size="lg" className="rounded-[8px]" asChild>
          <a href={href}>Start verification</a>
        </Button>
      </div>
    </section>
  );
}
