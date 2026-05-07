"use client";

import * as React from "react";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { useLocale } from "@/lib/i18n/provider";
import {
  SERVICE_CATEGORIES,
  type ServiceCategory,
} from "@/lib/onboarding/types";

type Props = {
  value?: ServiceCategory;
  other?: string;
  onChange: (v: ServiceCategory, other?: string) => void;
};

export function StepService({ value, other, onChange }: Props) {
  const { t } = useLocale();
  return (
    <section className="flex flex-col gap-[12px]">
      <h2 className="text-[16px] font-semibold leading-[22px] text-[var(--color-text-strong)]">
        {t("onb.s2.q")}
      </h2>
      <ChipGroup ariaLabel={t("onb.s2.q")}>
        {SERVICE_CATEGORIES.map((v) => (
          <Chip
            key={v}
            selected={value === v}
            onClick={() => onChange(v, v === "other" ? (other ?? "") : undefined)}
          >
            {t(`onb.svc.${v}`)}
          </Chip>
        ))}
      </ChipGroup>
      {value === "other" ? (
        <input
          type="text"
          autoFocus
          value={other ?? ""}
          onChange={(e) => onChange("other", e.target.value)}
          placeholder={t("onb.svc.otherPlaceholder")}
          maxLength={120}
          className="mt-[4px] h-[36px] rounded-[6px] border border-[var(--color-stroke-soft)] bg-[var(--color-bg-surface-elevated)] px-[12px] text-[14px] leading-[20px] text-[var(--color-text-strong)] outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)] focus:ring-offset-0"
        />
      ) : null}
    </section>
  );
}
