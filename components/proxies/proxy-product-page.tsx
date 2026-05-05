import { type RemixiconComponentType } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { PageActions } from "@/components/proxies/page-actions";
import { SubscriptionBanner } from "@/components/proxies/subscription-banner";
import { AutoTopupCard } from "@/components/proxies/auto-topup-card";
import { FeaturesAccordion } from "@/components/proxies/features-accordion";
import { ProxyStatistics } from "@/components/proxies/proxy-statistics";
import { RemainingTrafficCard } from "@/components/proxies/remaining-traffic";
import { ProxyAccessCard } from "@/components/proxies/proxy-access";
import { ApiExamplesCard } from "@/components/proxies/api-examples";
import { ProxyListCard } from "@/components/proxies/proxy-list";
import { OrdersTable } from "@/components/proxies/orders-table";
import { VerifyBanner } from "@/components/proxies/verify-banner";
import { cn } from "@/lib/cn";

export interface ProxyProductPageProps {
  title: string;
  productLabel: string;
  ordersTitle: string;
  icon: RemixiconComponentType;
  accent?: "teal" | "orange" | "blue" | "green" | "rose";
  nextPayment: string;
  willBeAdded: string;
  price: string;
  docsHref: string;
  guideHref: string;
}

const accentBg: Record<NonNullable<ProxyProductPageProps["accent"]>, string> = {
  teal: "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
  orange:
    "bg-[color-mix(in_oklab,#d46804_22%,#232323)] text-[#f59e3b]",
  blue: "bg-[color-mix(in_oklab,#4a6bff_22%,#232323)] text-[#7a9bff]",
  green: "bg-[color-mix(in_oklab,#22c55e_22%,#232323)] text-[#4ade80]",
  rose: "bg-[color-mix(in_oklab,#f43f5e_22%,#232323)] text-[#fb7185]",
};

export function ProxyProductPage(props: ProxyProductPageProps) {
  const {
    title,
    productLabel,
    ordersTitle,
    icon: Icon,
    accent = "teal",
    nextPayment,
    willBeAdded,
    price,
    docsHref,
    guideHref,
  } = props;

  return (
    <AppShell>
      <div className="flex items-center gap-[14px]">
        <span
          className={cn(
            "flex size-[44px] shrink-0 items-center justify-center rounded-full",
            accentBg[accent],
          )}
        >
          <Icon size={20} />
        </span>
        <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
          {title}
        </h1>
      </div>

      <div className="mt-[20px] sm:mt-[24px]">
        <PageActions
          changeHref="#"
          docsHref={docsHref}
          guideHref={guideHref}
          subUsersHref="#"
          logsHref="#"
        />
      </div>

      <div className="mt-[20px]">
        <SubscriptionBanner
          nextPayment={nextPayment}
          willBeAdded={willBeAdded}
          price={price}
          manageHref="#"
        />
      </div>

      <div className="enter-stagger mt-[20px] flex flex-col gap-[16px] sm:mt-[24px] sm:gap-[20px]">
        <AutoTopupCard learnHref="https://help.iproyal.com/en/articles/7827104-how-to-add-traffic-automatically" />
        <FeaturesAccordion />
        <ProxyStatistics productLabel={productLabel} />
        <RemainingTrafficCard remaining={-0.01} reserve={0} />
        <ProxyAccessCard />
        <ApiExamplesCard />
        <ProxyListCard />
        <OrdersTable title={ordersTitle} />
        <VerifyBanner href="#" />
      </div>
    </AppShell>
  );
}
