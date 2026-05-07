import * as React from "react";
import { RiPulseLine, RiShieldCheckLine, RiBillLine } from "@remixicon/react";
import { AuthCard } from "./auth-shell";
import { getT } from "@/lib/i18n/server";

export async function MarketingCard() {
  const { t } = await getT();
  return (
    <AuthCard variant="marketing" className="hidden md:flex">
      <div className="flex flex-col gap-[28px] p-[40px]">
        <div className="flex flex-col gap-[12px]">
          <h2 className="text-[32px] font-semibold leading-[40px] tracking-[-0.02em] text-[var(--color-text-strong)]">
            {t("auth.tagline")}
          </h2>
          <p className="max-w-[44ch] text-[14px] leading-[22px] text-[var(--color-text-sub)]">
            {t("auth.taglineBody")}
          </p>
        </div>

        <div
          aria-hidden
          className="h-px w-full bg-[color-mix(in_oklab,var(--color-brand-400)_22%,transparent)]"
        />

        <ul className="flex flex-col gap-[16px]">
          <Feature
            icon={<RiPulseLine size={18} />}
            title={t("auth.feature.track.title")}
            body={t("auth.feature.track.body")}
          />
          <Feature
            icon={<RiShieldCheckLine size={18} />}
            title={t("auth.feature.approve.title")}
            body={t("auth.feature.approve.body")}
          />
          <Feature
            icon={<RiBillLine size={18} />}
            title={t("auth.feature.invoice.title")}
            body={t("auth.feature.invoice.body")}
          />
        </ul>
      </div>
    </AuthCard>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-[14px]">
      <span className="flex size-[32px] shrink-0 items-center justify-center rounded-[8px] bg-[color-mix(in_oklab,var(--color-brand-400)_18%,transparent)] text-[var(--color-brand-400)]">
        {icon}
      </span>
      <div className="flex flex-col gap-[2px]">
        <h3 className="text-[14px] font-semibold leading-[20px] text-[var(--color-text-strong)]">
          {title}
        </h3>
        <p className="text-[13px] leading-[20px] text-[var(--color-text-sub)]">
          {body}
        </p>
      </div>
    </li>
  );
}
