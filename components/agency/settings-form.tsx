"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RiCheckLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/agency/client-modal";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import type { AgencySettings } from "@/lib/agency/types";

const CURRENCIES = ["USD", "EUR", "RON", "GBP"] as const;

export function SettingsForm({ initial }: { initial: AgencySettings }) {
  const { t } = useLocale();
  const router = useRouter();
  const [businessName, setBusinessName] = React.useState(
    initial.businessName ?? "",
  );
  const [businessEmail, setBusinessEmail] = React.useState(
    initial.businessEmail ?? "",
  );
  const [businessAddress, setBusinessAddress] = React.useState(
    initial.businessAddress ?? "",
  );
  const [defaultRate, setDefaultRate] = React.useState(
    initial.defaultHourlyRate != null ? String(initial.defaultHourlyRate) : "",
  );
  const [currency, setCurrency] = React.useState(initial.businessCurrency);

  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const rateNum = defaultRate === "" ? null : Number(defaultRate);
      if (rateNum !== null && (!Number.isFinite(rateNum) || rateNum < 0)) {
        throw new Error(t("settings.errors.rate"));
      }
      const res = await fetch("/api/agency/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim() || null,
          businessEmail: businessEmail.trim() || null,
          businessAddress: businessAddress.trim() || null,
          defaultHourlyRate: rateNum,
          businessCurrency: currency,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setSavedAt(Date.now());
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  React.useEffect(() => {
    if (!savedAt) return;
    const id = window.setTimeout(() => setSavedAt(null), 2400);
    return () => window.clearTimeout(id);
  }, [savedAt]);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[28px]">
      <Section title={t("settings.section.business")}>
        <Field label={t("settings.field.businessName")}>
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder={t("settings.field.businessNamePh")}
            autoComplete="organization"
          />
        </Field>
        <Field label={t("settings.field.businessEmail")}>
          <Input
            type="email"
            value={businessEmail}
            onChange={(e) => setBusinessEmail(e.target.value)}
            placeholder={t("settings.field.businessEmailPh")}
            autoComplete="email"
          />
        </Field>
        <Field label={t("settings.field.businessAddress")}>
          <Textarea
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            placeholder={t("settings.field.businessAddressPh")}
            rows={3}
          />
        </Field>
      </Section>

      <Section title={t("settings.section.billing")}>
        <Field label={t("settings.field.defaultRate")}>
          <div className="flex items-stretch gap-[8px]">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={defaultRate}
              onChange={(e) => setDefaultRate(e.target.value)}
              placeholder="0.00"
              className="flex-1"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={cn(
                "h-[40px] rounded-[6px] bg-[color-mix(in_oklab,white_3%,transparent)]",
                "px-[12px] text-[14px] font-medium",
                "text-[var(--color-text-strong)]",
                "ring-1 ring-[var(--color-stroke-soft)] outline-none",
                "hover:ring-[var(--color-stroke-sub)]",
                "focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
              )}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-[6px] text-[11.5px] font-normal normal-case tracking-normal text-[var(--color-text-soft)]">
            {t("settings.field.defaultRateHint")}
          </p>
        </Field>
      </Section>

      <div className="flex items-center justify-between border-t border-[var(--color-stroke-soft)] pt-[16px]">
        <div className="text-[12px] text-[var(--color-text-soft)]">
          {error ? (
            <span className="text-rose-300">{error}</span>
          ) : savedAt ? (
            <span className="inline-flex items-center gap-[6px] text-[var(--color-accent-green)]">
              <RiCheckLine size={14} /> {t("settings.saved")}
            </span>
          ) : null}
        </div>
        <Button type="submit" variant="primary-orange" size="md" disabled={saving}>
          {saving ? t("settings.saving") : t("settings.save")}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-[16px] rounded-[8px] bg-[var(--color-bg-surface)] p-[20px] ring-1 ring-[var(--color-stroke-soft)]">
      <h2 className="text-[14px] font-semibold leading-[20px] text-[var(--color-text-strong)]">
        {title}
      </h2>
      <div className="flex flex-col gap-[14px]">{children}</div>
    </section>
  );
}
