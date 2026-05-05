import { RiCircleFill } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function SubscriptionBanner({
  status = "Active",
  nextPayment,
  willBeAdded,
  price,
  manageHref,
}: {
  status?: string;
  nextPayment: string;
  willBeAdded: string;
  price: string;
  manageHref: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-wrap items-center gap-x-[24px] gap-y-[12px]",
        "rounded-[10px] px-[16px] py-[14px] sm:px-[20px]",
        "bg-[color-mix(in_oklab,var(--color-accent-green)_10%,var(--color-bg-surface))]",
        "ring-1 ring-[color-mix(in_oklab,var(--color-accent-green)_30%,transparent)]",
      )}
    >
      <div className="flex items-center gap-[10px]">
        <span className="relative inline-flex size-[10px] shrink-0">
          <span
            aria-hidden
            className="breathe-dot absolute inset-0 rounded-full bg-emerald-400"
          />
          <RiCircleFill
            size={10}
            className="relative text-emerald-400 drop-shadow-[0_0_4px_rgb(52_211_153/0.6)]"
          />
        </span>
        <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
          Subscription
        </span>
        <span
          className={cn(
            "rounded-[4px] px-[8px] py-[2px] text-[11px] font-semibold",
            "bg-[color-mix(in_oklab,var(--color-accent-green)_20%,transparent)]",
            "text-emerald-300",
          )}
        >
          {status}
        </span>
      </div>

      <Divider />

      <Stat label="Next payment at" value={nextPayment} />
      <Divider />
      <Stat label="Will be added" value={willBeAdded} />
      <Divider />
      <Stat label="Price" value={price} />

      <div className="ml-auto">
        <Button variant="outline" size="md" className="rounded-[8px]" asChild>
          <a href={manageHref}>Manage subscription</a>
        </Button>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-[8px] text-[13px]">
      <span className="text-[var(--color-text-soft)]">{label}</span>
      <span className="font-semibold tabular-nums text-[var(--color-text-strong)]">
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <span
      aria-hidden
      className="hidden h-[18px] w-px bg-[var(--color-stroke-soft)] sm:inline-block"
    />
  );
}
