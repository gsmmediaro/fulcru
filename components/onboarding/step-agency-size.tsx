"use client";

import * as React from "react";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { useLocale } from "@/lib/i18n/provider";
import {
  AGENCY_SIZES,
  CONCURRENT_CLIENTS,
  type AgencySize,
  type ConcurrentClients,
} from "@/lib/onboarding/types";

type Props = {
  agencySize?: AgencySize;
  concurrentClients?: ConcurrentClients;
  onAgencySize: (v: AgencySize) => void;
  onConcurrent: (v: ConcurrentClients) => void;
};

export function StepAgencySize({
  agencySize,
  concurrentClients,
  onAgencySize,
  onConcurrent,
}: Props) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-[24px]">
      <section className="flex flex-col gap-[12px]">
        <h2 className="text-[16px] font-semibold leading-[22px] text-[var(--color-text-strong)]">
          {t("onb.s1.q1")}
        </h2>
        <ChipGroup ariaLabel={t("onb.s1.q1")}>
          {AGENCY_SIZES.map((v) => (
            <Chip
              key={v}
              selected={agencySize === v}
              onClick={() => onAgencySize(v)}
            >
              {t(`onb.size.${v}`)}
            </Chip>
          ))}
        </ChipGroup>
      </section>

      <section className="flex flex-col gap-[12px]">
        <h2 className="text-[16px] font-semibold leading-[22px] text-[var(--color-text-strong)]">
          {t("onb.s1.q2")}
        </h2>
        <ChipGroup ariaLabel={t("onb.s1.q2")}>
          {CONCURRENT_CLIENTS.map((v) => (
            <Chip
              key={v}
              selected={concurrentClients === v}
              onClick={() => onConcurrent(v)}
            >
              {t(`onb.cc.${v}`)}
            </Chip>
          ))}
        </ChipGroup>
      </section>
    </div>
  );
}
