"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  RiTimeLine,
  RiScales3Line,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiCheckLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { BillingStyle } from "@/lib/agency/types";

type Props = {
  /** ISO timestamp when onboarding was completed; null/undefined means show wizard. */
  billingOnboardedAt?: string | null;
};

type AdjustmentKey = "quality" | "difficulty" | "category";

const ADJUSTMENT_DEFS: Array<{
  key: AdjustmentKey;
  title: string;
  description: string;
  example: React.ReactNode;
}> = [
  {
    key: "quality",
    title: "Quality confidence",
    description:
      "Lower a run's bill if a follow-up bugfix lands on the same folder within 14 days, or if you mark it manually.",
    example: (
      <>
        2h <Mul /> $100 <Mul /> 0.85 quality{" "}
        <span className="text-[var(--color-text-soft)]">=</span>{" "}
        <strong>$170</strong>
      </>
    ),
  },
  {
    key: "difficulty",
    title: "Difficulty weight",
    description:
      "Bias the bill by how hard the session was, percentile-ranked against your own last 100 runs.",
    example: (
      <>
        2h <Mul /> $100 <Mul /> 1.3 (hard){" "}
        <span className="text-[var(--color-text-soft)]">=</span>{" "}
        <strong>$260</strong>
      </>
    ),
  },
  {
    key: "category",
    title: "Category weight",
    description:
      "Bias by the type of work: feature and bugfix 1.0×, perf 1.1×, docs 0.85×.",
    example: (
      <>
        2h <Mul /> $100 <Mul /> 1.1 (perf){" "}
        <span className="text-[var(--color-text-soft)]">=</span>{" "}
        <strong>$220</strong>
      </>
    ),
  },
];

function Mul() {
  return (
    <span className="mx-[3px] text-[var(--color-text-soft)]">×</span>
  );
}

export function BillingStyleWizard({ billingOnboardedAt }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(true);
  const [step, setStep] = React.useState<1 | 2>(1);
  const [billingStyle, setBillingStyle] =
    React.useState<BillingStyle>("effort_adjusted");
  const [adjustments, setAdjustments] = React.useState<Record<AdjustmentKey, boolean>>({
    quality: true,
    difficulty: false,
    category: false,
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setMounted(true), []);

  const onSkip = React.useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/agency/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          billingStyle: "effort_adjusted",
          useQualityConfidence: true,
          useDifficultyWeight: false,
          useCategoryWeight: false,
          markBillingOnboarded: true,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }, [router]);

  // Lock body scroll while open
  React.useEffect(() => {
    if (!open || !mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, mounted]);

  // Escape key dismisses (uses skip semantics so the user is never stuck)
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onSkip]);

  // Don't render at all if already onboarded, but only after all hooks above
  if (billingOnboardedAt) return null;
  if (!mounted || !open) return null;

  async function onFinish() {
    setSubmitting(true);
    setError(null);
    try {
      const payload =
        billingStyle === "pure_active"
          ? {
              billingStyle: "pure_active" as const,
              useQualityConfidence: false,
              useDifficultyWeight: false,
              useCategoryWeight: false,
              markBillingOnboarded: true,
            }
          : {
              billingStyle: "effort_adjusted" as const,
              useQualityConfidence: adjustments.quality,
              useDifficultyWeight: adjustments.difficulty,
              useCategoryWeight: adjustments.category,
              markBillingOnboarded: true,
            };
      const res = await fetch("/api/agency/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  function selectStyle(next: BillingStyle) {
    setBillingStyle(next);
    setStep(2);
  }

  function toggleAdjustment(key: AdjustmentKey) {
    setAdjustments((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-wizard-title"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-[16px] sm:p-[24px]",
        "bg-black/55 backdrop-blur-sm",
        "transition-opacity duration-200",
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) void onSkip();
      }}
    >
      <div
        className={cn(
          "modal-rise relative flex w-full flex-col overflow-hidden",
          "rounded-[12px] bg-[var(--color-bg-surface-elevated)]",
          "ring-1 ring-[var(--color-stroke-soft)]",
          "shadow-[0_24px_60px_rgb(0_0_0/0.55)]",
          "max-h-[min(720px,calc(100dvh-32px))] max-w-[640px]",
        )}
      >
        {/* Stepper rail */}
        <div className="flex items-center gap-[6px] px-[28px] pt-[28px]">
          <Rail active />
          <Rail active={step === 2} />
          <span className="ml-[10px] text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-soft)] tabular-nums">
            Step {step} of 2
          </span>
        </div>

        {/* Sliding viewport */}
        <div className="relative overflow-hidden">
          <div
            className="flex w-[200%] transition-transform duration-[320ms] ease-[cubic-bezier(0.2,0,0,1)]"
            style={{ transform: `translateX(${step === 1 ? "0%" : "-50%"})` }}
          >
            {/* Step 1 */}
            <div className="w-1/2 shrink-0">
              <StepOne
                value={billingStyle}
                onSelect={selectStyle}
              />
            </div>

            {/* Step 2 */}
            <div className="w-1/2 shrink-0">
              <StepTwo
                billingStyle={billingStyle}
                adjustments={adjustments}
                onToggle={toggleAdjustment}
              />
            </div>
          </div>
        </div>

        {error ? (
          <p className="px-[28px] pt-[8px] text-[12px] text-rose-300">
            {error}
          </p>
        ) : null}

        {/* Footer */}
        <footer className="mt-auto flex items-center justify-between gap-[12px] border-t border-[var(--color-stroke-soft)] bg-[var(--color-bg-surface)] px-[20px] py-[14px] sm:px-[28px]">
          {step === 1 ? (
            <button
              type="button"
              onClick={() => void onSkip()}
              disabled={submitting}
              className={cn(
                "text-[12px] font-medium text-[var(--color-text-soft)]",
                "underline-offset-4 hover:text-[var(--color-text-strong)] hover:underline",
                "transition-colors duration-150",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              Skip for now
            </button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setStep(1)}
              disabled={submitting}
              leadingIcon={<RiArrowLeftLine size={14} />}
            >
              Back
            </Button>
          )}

          {step === 2 ? (
            <Button
              type="button"
              variant="primary-orange"
              size="md"
              onClick={() => void onFinish()}
              disabled={submitting}
              trailingIcon={
                submitting ? null : <RiCheckLine size={14} />
              }
            >
              {submitting ? "Saving..." : "Save and continue"}
            </Button>
          ) : (
            <span className="text-[11.5px] text-[var(--color-text-soft)]">
              Pick a style to continue
            </span>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function Rail({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "h-[3px] w-[28px] rounded-full transition-colors duration-200",
        active
          ? "bg-[var(--color-accent-orange)]"
          : "bg-[var(--color-stroke-soft)]",
      )}
    />
  );
}

// ─── Step 1 ────────────────────────────────────────────────────────────────────

function StepOne({
  value,
  onSelect,
}: {
  value: BillingStyle;
  onSelect: (next: BillingStyle) => void;
}) {
  return (
    <div className="flex flex-col gap-[24px] px-[20px] pb-[24px] pt-[20px] sm:px-[28px] sm:pt-[24px]">
      <header className="flex flex-col gap-[6px]">
        <h2
          id="billing-wizard-title"
          className="text-[22px] font-semibold leading-[28px] tracking-tight text-[var(--color-text-strong)]"
        >
          How do you bill clients?
        </h2>
        <p className="text-[14px] leading-[20px] text-[var(--color-text-soft)]">
          Pick the model that matches how you charge. You can change this any
          time in settings.
        </p>
      </header>

      <div className="grid gap-[12px] sm:grid-cols-2">
        <StyleCard
          icon={<RiTimeLine size={18} />}
          title="Pure active time"
          subtitle="I bill exact Claude active hours"
          detail="Best if you are an organization tracking employee time, or you bill clients by the literal session length. Multipliers and quality discounts are off."
          formula={
            <>
              active hours <Mul /> rate
            </>
          }
          selected={value === "pure_active"}
          onSelect={() => onSelect("pure_active")}
        />
        <StyleCard
          icon={<RiScales3Line size={18} />}
          title="Effort adjusted"
          subtitle="I bill the value of the work"
          detail="Applies your active-hours multiplier and lets you opt into quality, difficulty, and category weights. Best for agencies translating Claude time into client value."
          recommended
          formula={
            <>
              active hours <Mul /> rate <Mul /> multipliers
            </>
          }
          selected={value === "effort_adjusted"}
          onSelect={() => onSelect("effort_adjusted")}
        />
      </div>
    </div>
  );
}

function StyleCard({
  icon,
  title,
  subtitle,
  detail,
  formula,
  recommended,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  detail: string;
  formula: React.ReactNode;
  recommended?: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-col gap-[12px] rounded-[12px] p-[18px] text-left",
        "bg-[var(--color-bg-surface)] transition-[transform,box-shadow,background-color] duration-200 ease-out",
        "hover:translate-y-[-1px] hover:shadow-[0_8px_24px_rgb(0_0_0/0.28)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-orange)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-surface-elevated)]",
        selected
          ? "ring-2 ring-[var(--color-accent-orange)] bg-[color-mix(in_oklab,var(--color-accent-orange)_5%,var(--color-bg-surface))]"
          : "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <div className="flex items-start justify-between gap-[10px]">
        <span
          className={cn(
            "flex size-[32px] shrink-0 items-center justify-center rounded-[8px] transition-colors duration-200",
            selected
              ? "bg-[color-mix(in_oklab,var(--color-accent-orange)_18%,transparent)] text-[var(--color-accent-orange)]"
              : "bg-[var(--color-bg-tint-4)] text-[var(--color-text-soft)]",
          )}
        >
          {icon}
        </span>
        {recommended ? (
          <span
            className={cn(
              "rounded-full px-[8px] py-[2px] text-[10px] font-semibold uppercase tracking-[0.06em]",
              "bg-[color-mix(in_oklab,var(--color-accent-orange)_14%,transparent)]",
              "text-[var(--color-accent-orange)]",
              "ring-1 ring-[color-mix(in_oklab,var(--color-accent-orange)_30%,transparent)]",
            )}
          >
            Recommended
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-[2px]">
        <span className="text-[15px] font-semibold leading-[20px] text-[var(--color-text-strong)]">
          {title}
        </span>
        <span className="text-[12.5px] font-medium leading-[18px] text-[var(--color-accent-orange)]">
          {subtitle}
        </span>
      </div>

      <p className="text-[12.5px] leading-[18px] text-[var(--color-text-soft)]">
        {detail}
      </p>

      <div
        className={cn(
          "mt-[2px] border-t border-[var(--color-stroke-soft)] pt-[10px]",
          "text-[11.5px] tabular-nums text-[var(--color-text-soft)]",
        )}
      >
        <span className="opacity-60">formula</span>
        <span className="ml-[8px] font-medium text-[var(--color-text-sub)]">
          {formula}
        </span>
      </div>
    </button>
  );
}

// ─── Step 2 ────────────────────────────────────────────────────────────────────

function StepTwo({
  billingStyle,
  adjustments,
  onToggle,
}: {
  billingStyle: BillingStyle;
  adjustments: Record<AdjustmentKey, boolean>;
  onToggle: (key: AdjustmentKey) => void;
}) {
  if (billingStyle === "pure_active") {
    return (
      <div className="flex flex-col gap-[20px] px-[20px] pb-[28px] pt-[20px] sm:px-[28px] sm:pt-[24px]">
        <header className="flex flex-col gap-[6px]">
          <h2 className="text-[22px] font-semibold leading-[28px] tracking-tight text-[var(--color-text-strong)]">
            All set
          </h2>
          <p className="text-[14px] leading-[20px] text-[var(--color-text-soft)]">
            Runs will bill at active hours times your client rate, with no
            adjustments. Token costs stay attached for reference but won't
            change the invoice.
          </p>
        </header>

        <div
          className={cn(
            "flex items-center gap-[12px] rounded-[10px] p-[16px]",
            "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
          )}
        >
          <span
            className={cn(
              "flex size-[36px] shrink-0 items-center justify-center rounded-[8px]",
              "bg-[color-mix(in_oklab,var(--color-accent-orange)_14%,transparent)]",
              "text-[var(--color-accent-orange)]",
            )}
          >
            <RiTimeLine size={18} />
          </span>
          <div className="flex flex-col gap-[2px]">
            <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
              Pure active time
            </span>
            <span className="text-[12px] tabular-nums text-[var(--color-text-soft)]">
              2h <Mul /> $100{" "}
              <span className="text-[var(--color-text-soft)]">=</span>{" "}
              <strong className="text-[var(--color-text-sub)]">$200</strong>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px] px-[20px] pb-[24px] pt-[20px] sm:px-[28px] sm:pt-[24px]">
      <header className="flex flex-col gap-[6px]">
        <h2 className="text-[22px] font-semibold leading-[28px] tracking-tight text-[var(--color-text-strong)]">
          Which adjustments?
        </h2>
        <p className="text-[14px] leading-[20px] text-[var(--color-text-soft)]">
          These layer on top of your hourly multiplier. You can change these
          later.
        </p>
      </header>

      <div className="flex flex-col gap-[8px]">
        {ADJUSTMENT_DEFS.map((def) => (
          <AdjustmentRow
            key={def.key}
            title={def.title}
            description={def.description}
            example={def.example}
            checked={adjustments[def.key]}
            onChange={() => onToggle(def.key)}
          />
        ))}
      </div>
    </div>
  );
}

function AdjustmentRow({
  title,
  description,
  example,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  example: React.ReactNode;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-start gap-[12px] rounded-[10px] p-[14px]",
        "bg-[var(--color-bg-surface)] transition-[background-color,box-shadow] duration-150",
        "ring-1",
        checked
          ? "ring-[color-mix(in_oklab,var(--color-accent-orange)_60%,var(--color-stroke-soft))]"
          : "ring-[var(--color-stroke-soft)] hover:ring-[var(--color-stroke-sub)]",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={cn(
          "mt-[2px] h-[16px] w-[16px] shrink-0 cursor-pointer appearance-none rounded-[4px]",
          "bg-[var(--color-bg-tint-3)] ring-1 ring-[var(--color-stroke-soft)]",
          "transition-colors",
          "checked:bg-[var(--color-accent-orange)] checked:ring-[var(--color-accent-orange)]",
          "checked:bg-[url(\"data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2016%2016%27%3E%3Cpath%20fill%3D%27none%27%20stroke%3D%27white%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20d%3D%27M3.5%208.5l3%203%206-7%27%2F%3E%3C%2Fsvg%3E\")] checked:bg-center checked:bg-no-repeat",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-orange)]",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <div className="flex items-center justify-between gap-[8px]">
          <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
            {title}
          </span>
          <span
            className={cn(
              "text-[10px] font-medium uppercase tracking-[0.06em]",
              checked
                ? "text-[var(--color-accent-orange)]"
                : "text-[var(--color-text-soft)]",
            )}
          >
            {checked ? "On" : "Off"}
          </span>
        </div>
        <p className="text-[12px] leading-[17px] text-[var(--color-text-soft)]">
          {description}
        </p>
        <p className="text-[11.5px] tabular-nums text-[var(--color-text-sub)]">
          {example}
        </p>
      </div>
    </label>
  );
}
