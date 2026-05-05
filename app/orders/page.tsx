import { RiListCheck2 } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { OrdersTable } from "@/components/proxies/orders-table";
import { cn } from "@/lib/cn";

export default function OrdersPage() {
  return (
    <AppShell>
      <div className="flex items-center gap-[14px]">
        <span
          className={cn(
            "flex size-[44px] shrink-0 items-center justify-center rounded-full",
            "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
          )}
        >
          <RiListCheck2 size={20} />
        </span>
        <div className="flex flex-col">
          <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
            My Orders
          </h1>
          <p className="mt-[2px] text-[13px] text-[var(--color-text-soft)]">
            Every purchase across all proxy products in one place.
          </p>
        </div>
      </div>

      <div className="enter-stagger mt-[24px]">
        <OrdersTable title="All orders" />
      </div>
    </AppShell>
  );
}
