"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RiCheckLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/agency/client-modal";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AgencySettings,
  AiCostMode,
  BillMode,
} from "@/lib/agency/types";

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
  const [aiCostMode, setAiCostMode] = React.useState<AiCostMode>(
    initial.aiCostMode,
  );
  const [aiSub, setAiSub] = React.useState(
    String(initial.aiSubscriptionMonthlyUsd ?? 200),
  );
  const [defaultBillMode, setDefaultBillMode] = React.useState<BillMode>(
    initial.defaultBillMode,
  );
  const [activeMultiplier, setActiveMultiplier] = React.useState(
    String(initial.billActiveMultiplier ?? 1.5),
  );

  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [recomputing, setRecomputing] = React.useState(false);
  const [recomputeMsg, setRecomputeMsg] = React.useState<string | null>(null);

  const isDirty =
    businessName !== (initial.businessName ?? "") ||
    businessEmail !== (initial.businessEmail ?? "") ||
    businessAddress !== (initial.businessAddress ?? "") ||
    defaultRate !==
      (initial.defaultHourlyRate != null
        ? String(initial.defaultHourlyRate)
        : "") ||
    currency !== initial.businessCurrency ||
    aiCostMode !== initial.aiCostMode ||
    aiSub !== String(initial.aiSubscriptionMonthlyUsd ?? 200) ||
    defaultBillMode !== initial.defaultBillMode ||
    activeMultiplier !== String(initial.billActiveMultiplier ?? 1.5);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const rateNum = defaultRate === "" ? null : Number(defaultRate);
      if (rateNum !== null && (!Number.isFinite(rateNum) || rateNum < 0)) {
        throw new Error(t("settings.errors.rate"));
      }
      const subNum = Number(aiSub);
      if (!Number.isFinite(subNum) || subNum < 0) {
        throw new Error("Subscription amount must be 0 or greater");
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
          aiCostMode,
          aiSubscriptionMonthlyUsd: subNum,
          defaultBillMode,
          billActiveMultiplier: Number(activeMultiplier) || 1,
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
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-[40px] w-[96px] shrink-0 text-[14px] font-medium">
                <SelectValue placeholder="USD" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-[6px] text-[11.5px] font-normal normal-case tracking-normal text-[var(--color-text-soft)]">
            {t("settings.field.defaultRateHint")}
          </p>
        </Field>

        <Field label="Default bill mode">
          <Select
            value={defaultBillMode}
            onValueChange={(v) => setDefaultBillMode(v as BillMode)}
          >
            <SelectTrigger className="h-[40px] text-[14px] font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time_only">
                Time only (active hours × rate)
              </SelectItem>
              <SelectItem value="time_plus_tokens">
                Time + tokens (active hours × rate + token cost)
              </SelectItem>
              <SelectItem value="baseline">
                Baseline (skill baseline hours × rate)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-[6px] text-[11.5px] font-normal normal-case tracking-normal text-[var(--color-text-soft)]">
            How new runs price out by default. MCP runs may override this per call.
          </p>
        </Field>

        {defaultBillMode === "time_only" ? (
          <Field label="Active hours multiplier">
            <Input
              type="number"
              inputMode="decimal"
              min={1}
              step="0.1"
              value={activeMultiplier}
              onChange={(e) => setActiveMultiplier(e.target.value)}
              placeholder="1.5"
            />
            <p className="mt-[6px] text-[11.5px] font-normal normal-case tracking-normal text-[var(--color-text-soft)]">
              Multiplies the active hours captured in-session to cover research, design thinking, and time spent off-Claude. 1.5× means 1h active = 1.5h billed.
            </p>
          </Field>
        ) : null}
      </Section>

      <Section title="AI cost">
        <Field label="Cost model">
          <Select
            value={aiCostMode}
            onValueChange={(v) => setAiCostMode(v as AiCostMode)}
          >
            <SelectTrigger className="h-[40px] text-[14px] font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="subscription">
                Flat subscription (Claude Pro / Max)
              </SelectItem>
              <SelectItem value="per_token">
                Pay per token (API rates)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-[6px] text-[11.5px] font-normal normal-case tracking-normal text-[var(--color-text-soft)]">
            Subscription mode amortizes your monthly fee across active hours, so margin reflects your real cost.
          </p>
        </Field>

        {aiCostMode === "subscription" ? (
          <Field label="Subscription / month (USD)">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="1"
              value={aiSub}
              onChange={(e) => setAiSub(e.target.value)}
              placeholder="200"
            />
            <p className="mt-[6px] text-[11.5px] font-normal normal-case tracking-normal text-[var(--color-text-soft)]">
              Claude Pro = $20, Max 5x = $100, Max 20x = $200. Enter what you actually pay.
            </p>
          </Field>
        ) : null}

        <div className="mt-[4px] flex flex-wrap items-center gap-[12px] rounded-[8px] bg-[color-mix(in_oklab,white_2%,transparent)] p-[12px] ring-1 ring-[var(--color-stroke-soft)]">
          <div className="min-w-0 flex-1 text-[12px] text-[var(--color-text-soft)]">
            Recompute billable on every shipped run using the current bill mode. Token cost stays attached to each run for reference.
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={recomputing}
            onClick={async () => {
              setRecomputing(true);
              setRecomputeMsg(null);
              try {
                const res = await fetch("/api/agency/recompute-billable", {
                  method: "POST",
                });
                if (!res.ok) {
                  const j = (await res.json().catch(() => ({}))) as {
                    error?: string;
                  };
                  throw new Error(j.error ?? `HTTP ${res.status}`);
                }
                const j = (await res.json()) as { updated: number };
                setRecomputeMsg(`Updated ${j.updated} runs`);
                router.refresh();
              } catch (e) {
                setRecomputeMsg((e as Error).message);
              } finally {
                setRecomputing(false);
              }
            }}
          >
            {recomputing ? "Recomputing…" : "Recompute existing runs"}
          </Button>
          {recomputeMsg ? (
            <div className="w-full text-[11px] text-[var(--color-text-soft)]">
              {recomputeMsg}
            </div>
          ) : null}
        </div>
      </Section>

      {savedAt || error ? (
        <div className="text-[12px] text-[var(--color-text-soft)]">
          {error ? (
            <span className="text-rose-300">{error}</span>
          ) : savedAt ? (
            <span className="inline-flex items-center gap-[6px] text-[var(--color-accent-green)]">
              <RiCheckLine size={14} /> {t("settings.saved")}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Sticky save bar - appears only when there are unsaved changes */}
      <div
        aria-hidden={!isDirty}
        className={cn(
          "sticky bottom-[16px] z-10 mt-[8px]",
          "transition-[opacity,transform] duration-200",
          isDirty
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-[12px] opacity-0",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-[12px] rounded-[10px]",
            "bg-[var(--color-bg-surface-elevated)]/95 px-[16px] py-[12px]",
            "ring-1 ring-[var(--color-stroke-sub)]",
            "shadow-[var(--shadow-regular-md)] backdrop-blur-xl",
            "supports-[backdrop-filter]:bg-[var(--color-bg-surface-elevated)]/82",
          )}
        >
          <span className="text-[12px] text-[var(--color-text-soft)]">
            You have unsaved changes
          </span>
          <Button
            type="submit"
            variant="primary-orange"
            size="md"
            disabled={saving}
          >
            {saving ? t("settings.saving") : t("settings.save")}
          </Button>
        </div>
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
