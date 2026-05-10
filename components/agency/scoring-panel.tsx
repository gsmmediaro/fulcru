"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, Input, Textarea } from "@/components/agency/client-modal";
import { cn } from "@/lib/cn";
import {
  bucketLabel,
  categoryColor,
  categoryLabel,
  difficultyBucket,
} from "@/lib/agency/scoring";
import type {
  ChangeCategory,
  DifficultyBucket,
  QualitySignal,
  QualitySignalKind,
  Run,
} from "@/lib/agency/types";

const CATEGORY_OPTIONS: ChangeCategory[] = [
  "feature",
  "bugfix",
  "refactor",
  "infra",
  "docs",
  "test",
  "performance",
  "research",
];

const BUCKET_DOT_COLOR: Record<DifficultyBucket, string> = {
  trivial: "#94A3B8",
  normal: "#0EA5E9",
  moderate: "#F59E0B",
  hard: "#EF4444",
  very_hard: "#A78BFA",
};

const KIND_LABEL: Record<QualitySignalKind, string> = {
  manual_adjust: "Manual review",
  follow_up_bugfix: "Follow-up bugfix detected",
  deliverable_revert: "Deliverable reverted",
  deliverable_fix_commit: "Fix commit on deliverable",
};

const QUALITY_MIN = 0.3;
const QUALITY_MAX = 1.0;
const QUALITY_STEP = 0.05;

type Props = {
  run: Run;
};

export function ScoringPanel({ run }: Props) {
  const router = useRouter();

  // Category
  const [category, setCategory] = React.useState<ChangeCategory | "">(
    run.changeCategory ?? "",
  );
  const [savingCategory, setSavingCategory] = React.useState(false);
  const [categoryError, setCategoryError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCategory(run.changeCategory ?? "");
  }, [run.changeCategory]);

  async function onSaveCategory(next: ChangeCategory) {
    setSavingCategory(true);
    setCategoryError(null);
    try {
      const res = await fetch(`/api/agency/runs/${run.id}/category`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category: next }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setCategory(next);
      router.refresh();
    } catch (e) {
      setCategoryError((e as Error).message);
    } finally {
      setSavingCategory(false);
    }
  }

  // Quality confidence
  const [confidence, setConfidence] = React.useState<number>(
    run.qualityConfidence ?? 1,
  );
  const [reason, setReason] = React.useState("");
  const [savingQuality, setSavingQuality] = React.useState(false);
  const [qualityError, setQualityError] = React.useState<string | null>(null);
  const [signals, setSignals] = React.useState<QualitySignal[]>([]);
  const [loadingSignals, setLoadingSignals] = React.useState(true);

  React.useEffect(() => {
    setConfidence(run.qualityConfidence ?? 1);
  }, [run.qualityConfidence]);

  const loadSignals = React.useCallback(async () => {
    setLoadingSignals(true);
    try {
      const res = await fetch(
        `/api/agency/runs/${run.id}/quality-signals`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const j = (await res.json()) as { signals?: QualitySignal[] };
      setSignals(j.signals ?? []);
    } catch {
      // silent
    } finally {
      setLoadingSignals(false);
    }
  }, [run.id]);

  React.useEffect(() => {
    void loadSignals();
  }, [loadSignals]);

  async function onSaveQuality() {
    setSavingQuality(true);
    setQualityError(null);
    try {
      const res = await fetch(`/api/agency/runs/${run.id}/quality`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          confidence,
          reason: reason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setReason("");
      await loadSignals();
      router.refresh();
    } catch (e) {
      setQualityError((e as Error).message);
    } finally {
      setSavingQuality(false);
    }
  }

  // Impact note
  const [note, setNote] = React.useState(run.impactNote ?? "");
  const [savingNote, setSavingNote] = React.useState(false);
  const [noteError, setNoteError] = React.useState<string | null>(null);
  const [noteSavedAt, setNoteSavedAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNote(run.impactNote ?? "");
  }, [run.impactNote]);

  async function onSaveNote() {
    setSavingNote(true);
    setNoteError(null);
    try {
      const trimmed = note.trim();
      const res = await fetch(`/api/agency/runs/${run.id}/impact-note`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: trimmed ? trimmed : null }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setNoteSavedAt(Date.now());
      router.refresh();
    } catch (e) {
      setNoteError((e as Error).message);
    } finally {
      setSavingNote(false);
    }
  }

  React.useEffect(() => {
    if (!noteSavedAt) return;
    const id = window.setTimeout(() => setNoteSavedAt(null), 2400);
    return () => window.clearTimeout(id);
  }, [noteSavedAt]);

  const bucket = difficultyBucket(run.difficultyScore);
  const color = categoryColor(run.changeCategory ?? null);
  const noteCount = note.length;

  return (
    <div
      className={cn(
        "rounded-[8px] bg-[var(--color-bg-surface)] p-[16px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <div className="tp-overline text-[var(--color-text-soft)]">
        Scoring & quality
      </div>

      <div className="mt-[12px] flex flex-col gap-[16px]">
        {/* Category */}
        <div className="flex flex-col gap-[6px]">
          <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
            Category
          </div>
          <div className="flex items-center gap-[8px]">
            {run.changeCategory ? (
              <span
                className="inline-flex items-center rounded-[4px] px-[8px] py-[3px] text-[12px] font-semibold"
                style={{
                  backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`,
                  color,
                }}
              >
                {categoryLabel(run.changeCategory)}
              </span>
            ) : (
              <span className="text-[12px] text-[var(--color-text-soft)]">
                Uncategorized
              </span>
            )}
            <div className="ml-auto min-w-[148px]">
              <Select
                value={category || undefined}
                onValueChange={(v) => onSaveCategory(v as ChangeCategory)}
                disabled={savingCategory}
              >
                <SelectTrigger className="h-[32px] text-[12px]">
                  <SelectValue placeholder="Change" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {categoryError ? (
            <span className="text-[11px] text-rose-300">{categoryError}</span>
          ) : null}
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-[6px]">
          <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
            Difficulty
          </div>
          <div className="flex items-center gap-[10px]">
            <span
              aria-hidden
              className="h-[8px] w-[8px] shrink-0 rounded-full"
              style={{
                backgroundColor: bucket
                  ? BUCKET_DOT_COLOR[bucket]
                  : "var(--color-bg-tint-14)",
              }}
            />
            <span
              title="Percentile vs your last 100 runs (40% tokens, 40% active time, 20% events)"
              className="text-[14px] font-semibold tabular-nums text-[var(--color-text-strong)]"
            >
              {run.difficultyScore != null
                ? run.difficultyScore.toFixed(2)
                : "-"}
            </span>
            <span className="text-[12px] text-[var(--color-text-soft)]">
              {bucketLabel(bucket)}
            </span>
          </div>
          <p className="text-[11px] text-[var(--color-text-soft)]">
            Percentile vs your last 100 runs (40% tokens, 40% active time, 20% events).
          </p>
        </div>

        {/* Quality confidence */}
        <div className="flex flex-col gap-[8px]">
          <div className="flex items-baseline justify-between">
            <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
              Quality confidence
            </div>
            <div className="text-[18px] font-semibold tabular-nums text-[var(--color-text-strong)]">
              {confidence.toFixed(2)}
            </div>
          </div>

          <ConfidenceSlider value={confidence} onChange={setConfidence} />

          <Field label="Reason (optional)">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you adjusting?"
            />
          </Field>

          <div className="flex items-center justify-end gap-[8px]">
            {qualityError ? (
              <span className="text-[11px] text-rose-300">{qualityError}</span>
            ) : null}
            <Button
              type="button"
              variant="primary-orange"
              size="sm"
              disabled={
                savingQuality ||
                Math.abs(confidence - run.qualityConfidence) < 1e-6
              }
              onClick={onSaveQuality}
            >
              {savingQuality ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Quality signals */}
        <div className="flex flex-col gap-[8px]">
          <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
            Quality signals
          </div>
          {loadingSignals ? (
            <div className="text-[12px] text-[var(--color-text-soft)]">
              Loading...
            </div>
          ) : signals.length === 0 ? (
            <div className="text-[12px] text-[var(--color-text-soft)]">
              No signals yet. Quality stays at 1.00 until something changes it.
            </div>
          ) : (
            <ul className="flex flex-col gap-[8px]">
              {signals.map((s) => (
                <SignalRow key={s.id} signal={s} />
              ))}
            </ul>
          )}
        </div>

        {/* Impact note */}
        <div className="flex flex-col gap-[6px]">
          <div className="flex items-baseline justify-between">
            <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-soft)]">
              Impact note
            </div>
            <span className="text-[11px] tabular-nums text-[var(--color-text-soft)]">
              {noteCount}/280
            </span>
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 280))}
            placeholder="What did this run accomplish for the client?"
            rows={3}
            maxLength={280}
          />
          <p className="text-[11px] text-[var(--color-text-soft)]">
            Used in the Value Report. Does not appear on invoices.
          </p>
          <div className="flex items-center justify-end gap-[8px]">
            {noteError ? (
              <span className="text-[11px] text-rose-300">{noteError}</span>
            ) : noteSavedAt ? (
              <span className="text-[11px] text-[var(--color-accent-green)]">
                Saved
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingNote || note === (run.impactNote ?? "")}
              onClick={onSaveNote}
            >
              {savingNote ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalRow({ signal }: { signal: QualitySignal }) {
  const sign = signal.delta > 0 ? "+" : "";
  const deltaTone =
    signal.delta < 0
      ? "text-rose-300"
      : signal.delta > 0
        ? "text-emerald-300"
        : "text-[var(--color-text-soft)]";
  return (
    <li
      className={cn(
        "flex flex-col gap-[4px] rounded-[6px] px-[10px] py-[8px]",
        "bg-[var(--color-bg-tint-2)] ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <div className="flex items-center justify-between gap-[8px]">
        <span className="text-[12px] font-semibold text-[var(--color-text-strong)]">
          {KIND_LABEL[signal.kind]}
        </span>
        <span
          className={cn(
            "text-[12px] font-semibold tabular-nums",
            deltaTone,
          )}
        >
          {sign}
          {signal.delta.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-[8px]">
        <span className="line-clamp-2 text-[11px] text-[var(--color-text-soft)]">
          {signal.reason ?? "-"}
        </span>
        <div className="flex shrink-0 items-center gap-[6px]">
          <span
            className={cn(
              "rounded-[4px] px-[6px] py-[1px] text-[10px] font-semibold uppercase tracking-[0.04em]",
              signal.source === "auto"
                ? "bg-[color-mix(in_oklab,#0EA5E9_16%,transparent)] text-sky-300"
                : "bg-[color-mix(in_oklab,var(--color-accent-orange)_16%,transparent)] text-[var(--color-accent-orange)]",
            )}
          >
            {signal.source}
          </span>
          <span
            className="text-[10px] text-[var(--color-text-soft)]"
            suppressHydrationWarning
          >
            {formatDistanceToNowStrict(new Date(signal.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    </li>
  );
}

function ConfidenceSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const safe = Math.min(QUALITY_MAX, Math.max(QUALITY_MIN, value));
  return (
    <Slider
      value={safe}
      min={QUALITY_MIN}
      max={QUALITY_MAX}
      step={QUALITY_STEP}
      onChange={onChange}
      ariaLabel="Quality confidence"
      trailing={
        <span className="min-w-[40px] text-center">{safe.toFixed(2)}</span>
      }
    />
  );
}
