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
  BillingStyle,
  ThemePreference,
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
    String(initial.billActiveMultiplier ?? 1),
  );
  const [billingStyle, setBillingStyle] = React.useState<BillingStyle>(
    initial.billingStyle ?? "effort_adjusted",
  );
  const [useQuality, setUseQuality] = React.useState(
    initial.useQualityConfidence ?? true,
  );
  const [useDifficulty, setUseDifficulty] = React.useState(
    initial.useDifficultyWeight ?? false,
  );
  const [useCategory, setUseCategory] = React.useState(
    initial.useCategoryWeight ?? false,
  );
  const [theme, setTheme] = React.useState<ThemePreference>(
    initial.theme ?? "dark",
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
    activeMultiplier !== String(initial.billActiveMultiplier ?? 1) ||
    billingStyle !== (initial.billingStyle ?? "effort_adjusted") ||
    useQuality !== (initial.useQualityConfidence ?? true) ||
    useDifficulty !== (initial.useDifficultyWeight ?? false) ||
    useCategory !== (initial.useCategoryWeight ?? false) ||
    theme !== (initial.theme ?? "dark");

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
          billingStyle,
          useQualityConfidence: useQuality,
          useDifficultyWeight: useDifficulty,
          useCategoryWeight: useCategory,
          theme,
          markBillingOnboarded: true,
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

  // Theme: instant preview. Update local state, the live DOM, and the
  // cookie so reloads paint the new palette before hydration. The
  // persisted server value still rides along with the next form submit.
  const onThemeChange = React.useCallback((next: ThemePreference) => {
    setTheme(next);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.setAttribute("data-theme", next);
      const isDark =
        next === "dark" ||
        (next === "auto" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", isDark);
      document.cookie = `fulcru_theme=${next}; path=/; max-age=31536000; samesite=lax`;
    }
  }, []);

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

      <Section title="Appearance">
        <div className="flex flex-col gap-[6px]">
          <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
            Theme
          </span>
          <div
            role="radiogroup"
            aria-label="Theme"
            className="grid gap-[10px] sm:grid-cols-3"
          >
            {THEME_OPTIONS.map((opt) => (
              <ThemeOption
                key={opt.value}
                value={opt.value}
                title={opt.title}
                subtitle={opt.subtitle}
                preview={opt.preview}
                selected={theme === opt.value}
                onSelect={() => onThemeChange(opt.value)}
              />
            ))}
          </div>
          <p className="mt-[4px] text-[11.5px] font-normal normal-case tracking-normal text-[var(--color-text-soft)]">
            Auto follows your system. The change previews instantly; saving keeps it across devices.
          </p>
        </div>
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
            <MultiplierSlider
              value={activeMultiplier}
              onChange={setActiveMultiplier}
            />
            <p className="mt-[6px] text-[11.5px] font-normal normal-case tracking-normal text-[var(--color-text-soft)]">
              Multiplies the active hours captured in-session to cover research, design thinking, and time spent off-Claude. 1.5× means 1h active = 1.5h billed.
            </p>
          </Field>
        ) : null}
      </Section>

      <Section title="Billing style">
        <div
          role="radiogroup"
          aria-label="Billing style"
          className="grid gap-[10px] sm:grid-cols-2"
        >
          {(
            [
              {
                value: "pure_active" as const,
                title: "Pure active time",
                desc: "Bill exactly the active Claude hours × rate. For organizations that need precise time accounting.",
              },
              {
                value: "effort_adjusted" as const,
                title: "Effort adjusted",
                desc: "Apply the multiplier, quality, difficulty, and category weights you opt into below. For agencies billing translated effort.",
              },
            ]
          ).map((opt) => {
            const selected = billingStyle === opt.value;
            return (
              <label
                key={opt.value}
                className={cn(
                  "group relative flex cursor-pointer flex-col gap-[6px] rounded-[8px] bg-[var(--color-bg-surface)] p-[14px]",
                  "ring-1 transition-[box-shadow,background-color] duration-150",
                  selected
                    ? "bg-[color-mix(in_oklab,var(--color-accent-orange)_6%,var(--color-bg-surface))] ring-[var(--color-accent-orange)]"
                    : "ring-[var(--color-stroke-soft)] hover:ring-[color-mix(in_oklab,var(--color-accent-orange)_40%,var(--color-stroke-soft))]",
                )}
              >
                <input
                  type="radio"
                  name="billingStyle"
                  value={opt.value}
                  checked={selected}
                  onChange={() => setBillingStyle(opt.value)}
                  className="sr-only"
                />
                <div className="flex items-center gap-[8px]">
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full ring-1 transition-colors",
                      selected
                        ? "ring-[var(--color-accent-orange)]"
                        : "ring-[var(--color-stroke-soft)]",
                    )}
                  >
                    <span
                      className={cn(
                        "h-[8px] w-[8px] rounded-full transition-transform",
                        selected
                          ? "scale-100 bg-[var(--color-accent-orange)]"
                          : "scale-0 bg-transparent",
                      )}
                    />
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
                    {opt.title}
                  </span>
                </div>
                <p className="text-[11.5px] font-normal normal-case leading-[16px] tracking-normal text-[var(--color-text-soft)]">
                  {opt.desc}
                </p>
              </label>
            );
          })}
        </div>

        {billingStyle === "effort_adjusted" ? (
          <div className="flex flex-col gap-[10px]">
            {(
              [
                {
                  key: "quality" as const,
                  checked: useQuality,
                  setter: setUseQuality,
                  title: "Quality confidence",
                  desc: "Multiply by run quality (0.3 to 1.0). Auto-drops on follow-up bugfixes; you can override per run.",
                },
                {
                  key: "difficulty" as const,
                  checked: useDifficulty,
                  setter: setUseDifficulty,
                  title: "Difficulty weight",
                  desc: "Adds up to +50% on hard sessions vs easy ones, percentile-ranked against your last 100 runs.",
                },
                {
                  key: "category" as const,
                  checked: useCategory,
                  setter: setUseCategory,
                  title: "Category weight",
                  desc: "Per-category bias: bugfix and feature 1.0×, perf 1.1×, docs 0.85×, refactor and test 0.95×.",
                },
              ]
            ).map((row) => (
              <label
                key={row.key}
                className={cn(
                  "flex cursor-pointer items-start gap-[10px] rounded-[6px] px-[10px] py-[8px]",
                  "transition-colors hover:bg-[var(--color-bg-tint-2)]",
                )}
              >
                <span className="relative mt-[2px] inline-flex h-[16px] w-[16px] shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={row.checked}
                    onChange={(e) => row.setter(e.target.checked)}
                    className={cn(
                      "peer h-[16px] w-[16px] cursor-pointer appearance-none rounded-[4px] bg-[var(--color-bg-surface)] ring-1 transition-colors",
                      "ring-[var(--color-stroke-soft)] checked:bg-[var(--color-accent-orange)] checked:ring-[var(--color-accent-orange)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
                    )}
                  />
                  <RiCheckLine
                    aria-hidden
                    size={12}
                    className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-[var(--color-text-strong)]">
                    {row.title}
                  </div>
                  <p className="mt-[2px] text-[11.5px] font-normal normal-case leading-[16px] tracking-normal text-[var(--color-text-soft)]">
                    {row.desc}
                  </p>
                </div>
              </label>
            ))}
          </div>
        ) : null}

        <BillingMathPreview
          billingStyle={billingStyle}
          activeMultiplier={activeMultiplier}
          useQuality={useQuality}
          useDifficulty={useDifficulty}
          useCategory={useCategory}
        />
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

        <div className="mt-[4px] flex flex-wrap items-center gap-[12px] rounded-[8px] bg-[var(--color-bg-tint-2)] p-[12px] ring-1 ring-[var(--color-stroke-soft)]">
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

const MULT_MIN = 1;
const MULT_MAX = 3;
const MULT_STEP = 0.1;

function MultiplierSlider({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const num = Number(value);
  const safe =
    Number.isFinite(num) && num >= MULT_MIN && num <= MULT_MAX ? num : MULT_MIN;
  const pct = ((safe - MULT_MIN) / (MULT_MAX - MULT_MIN)) * 100;
  const display = safe.toFixed(1);
  return (
    <div className="flex items-center gap-[14px]">
      <input
        type="range"
        min={MULT_MIN}
        max={MULT_MAX}
        step={MULT_STEP}
        value={safe}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Active hours multiplier"
        className="h-[24px] flex-1 cursor-pointer appearance-none bg-transparent outline-none focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-[var(--color-brand-400)] [&::-moz-range-thumb]:h-[16px] [&::-moz-range-thumb]:w-[16px] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--color-accent-orange)] [&::-moz-range-thumb]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent-orange)_25%,transparent)] [&::-moz-range-track]:h-[6px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[var(--color-bg-tint-8)] [&::-webkit-slider-runnable-track]:h-[6px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:h-[16px] [&::-webkit-slider-thumb]:w-[16px] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-accent-orange)] [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent-orange)_25%,transparent)]"
        style={{
          ["--track" as string]: `linear-gradient(to right, var(--color-accent-orange) 0%, var(--color-accent-orange) ${pct}%, var(--color-bg-tint-8) ${pct}%, var(--color-bg-tint-8) 100%)`,
          background: `linear-gradient(to right, var(--color-accent-orange) 0%, var(--color-accent-orange) ${pct}%, var(--color-bg-tint-8) ${pct}%, var(--color-bg-tint-8) 100%)`,
          backgroundSize: "100% 6px",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="min-w-[56px] rounded-[6px] bg-[var(--color-bg-tint-3)] px-[10px] py-[6px] text-center text-[13px] font-semibold tabular-nums normal-case tracking-normal text-[var(--color-text-strong)] ring-1 ring-[var(--color-stroke-soft)]">
        {display}×
      </div>
    </div>
  );
}

function BillingMathPreview({
  billingStyle,
  activeMultiplier,
  useQuality,
  useDifficulty,
  useCategory,
}: {
  billingStyle: BillingStyle;
  activeMultiplier: string;
  useQuality: boolean;
  useDifficulty: boolean;
  useCategory: boolean;
}) {
  // Hypothetical run: 2h active at $100/h, category=feature, difficulty=0.6, quality=0.95.
  const hours = 2;
  const rate = 100;
  const quality = 0.95;
  const difficultyScore = 0.6;
  const difficultyMult = 1 + difficultyScore * 0.5; // 1.3
  const categoryWeight = 1.0; // feature
  const multNum = Number(activeMultiplier);
  const multiplier =
    Number.isFinite(multNum) && multNum > 0 ? multNum : 1;

  const isPure = billingStyle === "pure_active";

  type Step = { label: string; value: string };
  const steps: Step[] = [
    { label: `${hours}h`, value: `${hours}` },
    { label: `$${rate}/h`, value: `${rate}` },
  ];
  let total = hours * rate;

  if (!isPure) {
    if (multiplier !== 1) {
      steps.push({
        label: `${multiplier.toFixed(1)}× multiplier`,
        value: `${multiplier}`,
      });
      total *= multiplier;
    }
    if (useQuality) {
      steps.push({ label: `${quality.toFixed(2)} quality`, value: `${quality}` });
      total *= quality;
    }
    if (useDifficulty) {
      steps.push({
        label: `${difficultyMult.toFixed(2)} difficulty`,
        value: `${difficultyMult}`,
      });
      total *= difficultyMult;
    }
    if (useCategory) {
      steps.push({
        label: `${categoryWeight.toFixed(2)} category`,
        value: `${categoryWeight}`,
      });
      total *= categoryWeight;
    }
  }

  const formula = steps.map((s) => s.label).join(" × ");
  const totalStr = `$${total.toFixed(2)}`;

  return (
    <div className="mt-[4px] flex flex-col gap-[6px] rounded-[8px] bg-[var(--color-bg-tint-2)] p-[12px] ring-1 ring-[var(--color-stroke-soft)]">
      <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
        Example: 2h run, $100/h, feature, difficulty 0.6, quality 0.95
      </div>
      <div className="flex flex-wrap items-baseline gap-x-[8px] gap-y-[4px]">
        <span className="text-[12px] font-normal normal-case tracking-normal text-[var(--color-text-soft)]">
          {formula} =
        </span>
        <span className="text-[15px] font-semibold tabular-nums text-[var(--color-text-strong)]">
          {totalStr}
        </span>
      </div>
      {isPure ? (
        <p className="text-[11px] font-normal normal-case tracking-normal text-[var(--color-text-soft)]">
          Pure active time ignores multipliers and weights. The client pays for what Claude actually worked.
        </p>
      ) : null}
    </div>
  );
}

// ─── Appearance: theme picker ──────────────────────────────────────────────────

type ThemeOptionDef = {
  value: ThemePreference;
  title: string;
  subtitle: string;
  preview: "auto" | "light" | "dark";
};

const THEME_OPTIONS: ThemeOptionDef[] = [
  {
    value: "auto",
    title: "Auto",
    subtitle: "Match my system",
    preview: "auto",
  },
  {
    value: "light",
    title: "Light",
    subtitle: "Always light",
    preview: "light",
  },
  {
    value: "dark",
    title: "Dark",
    subtitle: "Always dark",
    preview: "dark",
  },
];

function ThemeOption({
  value,
  title,
  subtitle,
  preview,
  selected,
  onSelect,
}: {
  value: ThemePreference;
  title: string;
  subtitle: string;
  preview: "auto" | "light" | "dark";
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "group relative flex cursor-pointer flex-col gap-[10px] rounded-[10px] bg-[var(--color-bg-surface)] p-[12px]",
        "ring-1 transition-[box-shadow,background-color,transform] duration-150",
        selected
          ? "bg-[color-mix(in_oklab,var(--color-accent-orange)_6%,var(--color-bg-surface))] ring-[var(--color-accent-orange)]"
          : "ring-[var(--color-stroke-soft)] hover:ring-[color-mix(in_oklab,var(--color-accent-orange)_40%,var(--color-stroke-soft))]",
      )}
    >
      <input
        type="radio"
        name="theme"
        value={value}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />

      <ThemePreviewSwatch variant={preview} />

      <div className="flex items-center gap-[8px]">
        <span
          aria-hidden
          className={cn(
            "flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full ring-1 transition-colors",
            selected
              ? "ring-[var(--color-accent-orange)]"
              : "ring-[var(--color-stroke-sub)]",
          )}
        >
          <span
            className={cn(
              "h-[8px] w-[8px] rounded-full transition-transform",
              selected
                ? "scale-100 bg-[var(--color-accent-orange)]"
                : "scale-0 bg-transparent",
            )}
          />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-[13px] font-semibold leading-[18px] text-[var(--color-text-strong)]">
            {title}
          </span>
          <span className="text-[11.5px] font-normal normal-case leading-[16px] tracking-normal text-[var(--color-text-soft)]">
            {subtitle}
          </span>
        </div>
      </div>
    </label>
  );
}

/**
 * Tiny mock-window preview rendered with hard-coded colors so it shows
 * the target palette no matter what theme the rest of the page is in.
 */
function ThemePreviewSwatch({
  variant,
}: {
  variant: "auto" | "light" | "dark";
}) {
  if (variant === "auto") {
    return (
      <div className="relative h-[64px] w-full overflow-hidden rounded-[8px] ring-1 ring-[var(--color-stroke-soft)]">
        <div className="absolute inset-0 grid grid-cols-2">
          <SwatchHalf tone="light" align="left" />
          <SwatchHalf tone="dark" align="right" />
        </div>
        <div
          aria-hidden
          className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[color-mix(in_oklab,#0F172A_18%,transparent)]"
        />
      </div>
    );
  }
  return (
    <div className="relative h-[64px] w-full overflow-hidden rounded-[8px] ring-1 ring-[var(--color-stroke-soft)]">
      <SwatchHalf tone={variant} align="full" />
    </div>
  );
}

function SwatchHalf({
  tone,
  align,
}: {
  tone: "light" | "dark";
  align: "left" | "right" | "full";
}) {
  const isLight = tone === "light";
  const bg = isLight ? "#F1F3F5" : "#1C1C1C";
  const surface = isLight ? "#FFFFFF" : "#232323";
  const stroke = isLight ? "#E2E8F0" : "#2F2F2F";
  const textStrong = isLight ? "#0F172A" : "#E1E1E1";
  const textSoft = isLight ? "#94A3B8" : "#575757";

  // Inline styles let the swatch render its target tones regardless of
  // the active app theme (so the dark swatch always looks dark, etc).
  return (
    <div
      className={cn(
        "relative h-full w-full",
        align === "left" ? "rounded-l-[8px]" : "",
        align === "right" ? "rounded-r-[8px]" : "",
      )}
      style={{ backgroundColor: bg }}
    >
      {/* Faux topbar */}
      <div
        className="absolute left-0 right-0 top-0 h-[14px]"
        style={{ backgroundColor: surface, borderBottom: `1px solid ${stroke}` }}
      >
        <span
          className="absolute left-[6px] top-1/2 h-[3px] w-[14px] -translate-y-1/2 rounded-full"
          style={{ backgroundColor: textSoft, opacity: 0.6 }}
        />
      </div>
      {/* Faux card */}
      <div
        className="absolute bottom-[6px] left-[6px] right-[6px] top-[20px] rounded-[4px]"
        style={{
          backgroundColor: surface,
          border: `1px solid ${stroke}`,
        }}
      >
        <span
          className="absolute left-[6px] right-[14px] top-[6px] h-[3px] rounded-full"
          style={{ backgroundColor: textStrong, opacity: 0.85 }}
        />
        <span
          className="absolute left-[6px] right-[24px] top-[12px] h-[2px] rounded-full"
          style={{ backgroundColor: textSoft, opacity: 0.6 }}
        />
        <span
          className="absolute left-[6px] right-[10px] top-[18px] h-[2px] rounded-full"
          style={{ backgroundColor: textSoft, opacity: 0.4 }}
        />
      </div>
    </div>
  );
}
