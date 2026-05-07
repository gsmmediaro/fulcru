"use client";

import * as React from "react";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { useLocale } from "@/lib/i18n/provider";
import { USE_CASES, type UseCase } from "@/lib/onboarding/types";

type Props = {
  value: UseCase[];
  onChange: (v: UseCase[]) => void;
};

export function StepUseCases({ value, onChange }: Props) {
  const { t } = useLocale();
  const toggle = (uc: UseCase) =>
    onChange(value.includes(uc) ? value.filter((v) => v !== uc) : [...value, uc]);
  return (
    <section className="flex flex-col gap-[12px]">
      <div className="flex flex-col gap-[2px]">
        <h2 className="text-[16px] font-semibold leading-[22px] text-[var(--color-text-strong)]">
          {t("onb.s3.q")}
        </h2>
        <p className="text-[12px] leading-[16px] text-[var(--color-text-soft)]">
          {t("onb.s3.hint")}
        </p>
      </div>
      <ChipGroup multi ariaLabel={t("onb.s3.q")}>
        {USE_CASES.map((uc) => (
          <Chip key={uc} multi selected={value.includes(uc)} onClick={() => toggle(uc)}>
            {t(`onb.uc.${uc}`)}
          </Chip>
        ))}
      </ChipGroup>
    </section>
  );
}
