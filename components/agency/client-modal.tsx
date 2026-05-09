"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RiCloseLine } from "@remixicon/react";
import { Modal, ModalCloseButton } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import type { Client } from "@/lib/agency/types";

// ─── Shared form primitives (re-exported for sibling modals) ───────────────────

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex flex-col gap-[6px] text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-soft)]"
    >
      {label}
      {children}
    </label>
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-[40px] w-full rounded-[6px] bg-[var(--color-bg-tint-3)]",
        "px-[12px] text-[14px] font-normal normal-case tracking-normal",
        "text-[var(--color-text-strong)] placeholder:text-[var(--color-text-soft)]",
        "ring-1 ring-[var(--color-stroke-soft)] outline-none",
        "transition-colors duration-150",
        "hover:ring-[var(--color-stroke-sub)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[80px] w-full rounded-[6px] bg-[var(--color-bg-tint-3)]",
        "px-[12px] py-[10px] text-[14px] font-normal normal-case tracking-normal",
        "text-[var(--color-text-strong)] placeholder:text-[var(--color-text-soft)]",
        "ring-1 ring-[var(--color-stroke-soft)] outline-none",
        "transition-colors duration-150",
        "hover:ring-[var(--color-stroke-sub)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
        className,
      )}
      {...props}
    />
  );
});

// ─── Cc chip input ─────────────────────────────────────────────────────────────

function CcChipInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const atMax = value.length >= 3;

  function commit(raw: string) {
    const trimmed = raw.trim().replace(/,+$/, "");
    if (!trimmed) return;
    const parts = trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = [...value];
    for (const p of parts) {
      if (next.length < 3 && !next.includes(p)) next.push(p);
    }
    onChange(next);
    setDraft("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function onBlur() {
    if (draft) commit(draft);
  }

  function onChange_(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (v.endsWith(",")) {
      commit(v);
    } else {
      setDraft(v);
    }
  }

  function remove(email: string) {
    onChange(value.filter((e) => e !== email));
  }

  return (
    <div
      className={cn(
        "flex min-h-[40px] w-full flex-wrap gap-[6px] rounded-[6px]",
        "bg-[var(--color-bg-tint-3)]",
        "px-[10px] py-[6px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
        "transition-colors duration-150",
        "hover:ring-[var(--color-stroke-sub)]",
        "focus-within:ring-2 focus-within:ring-[var(--color-brand-400)]",
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((email) => (
        <span
          key={email}
          className={cn(
            "inline-flex items-center gap-[4px] rounded-[4px]",
            "bg-[color-mix(in_oklab,var(--color-brand-400)_14%,transparent)]",
            "px-[8px] py-[2px]",
            "text-[12px] font-medium text-[var(--color-brand-400)]",
            "ring-1 ring-[var(--color-brand-400)/30]",
          )}
        >
          {email}
          <button
            type="button"
            aria-label={`Remove ${email}`}
            onClick={(e) => {
              e.stopPropagation();
              remove(email);
            }}
            className="text-[var(--color-brand-400)] opacity-60 hover:opacity-100 transition-opacity"
          >
            <RiCloseLine size={12} />
          </button>
        </span>
      ))}
      {!atMax && (
        <input
          ref={inputRef}
          type="email"
          value={draft}
          onChange={onChange_}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={value.length === 0 ? "cc@example.com" : ""}
          className={cn(
            "min-w-[140px] flex-1 bg-transparent text-[14px] font-normal",
            "text-[var(--color-text-strong)] placeholder:text-[var(--color-text-soft)]",
            "outline-none",
          )}
        />
      )}
    </div>
  );
}

// ─── Shared form state ─────────────────────────────────────────────────────────

type FormState = {
  name: string;
  email: string;
  ccRecipients: string[];
  address: string;
  note: string;
  initials: string;
  accentColor: string;
  hourlyRate: string;
};

function makeDefaultState(client?: Client): FormState {
  return {
    name: client?.name ?? "",
    email: client?.email ?? "",
    ccRecipients: client?.ccRecipients ?? [],
    address: client?.address ?? "",
    note: client?.note ?? "",
    initials: client?.initials ?? "",
    accentColor: client?.accentColor ?? "#FF7A1A",
    hourlyRate: client?.hourlyRate != null ? String(client.hourlyRate) : "150",
  };
}

// ─── FormBody (shared between create and edit) ─────────────────────────────────

function FormBody({
  state,
  setState,
  isEdit,
  currency,
}: {
  state: FormState;
  setState: React.Dispatch<React.SetStateAction<FormState>>;
  isEdit: boolean;
  currency: string;
}) {
  const { t } = useLocale();

  function set<K extends keyof FormState>(key: K) {
    return (val: FormState[K]) =>
      setState((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div className="flex flex-col gap-[16px] px-[24px] pb-[8px]">
      {/* Name */}
      <Field label={t("newClient.name")} htmlFor="cl-name">
        <Input
          id="cl-name"
          value={state.name}
          onChange={(e) => set("name")(e.target.value)}
          placeholder={t("newClient.namePh")}
          required
          autoFocus={!isEdit}
        />
      </Field>

      {/* Email */}
      <Field label={t("editClient.email")} htmlFor="cl-email">
        <Input
          id="cl-email"
          type="email"
          value={state.email}
          onChange={(e) => set("email")(e.target.value)}
          placeholder={t("editClient.emailPh")}
        />
      </Field>

      {/* Cc recipients */}
      <label className="flex flex-col gap-[6px] text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-soft)]">
        {t("editClient.ccRecipients")}
        <CcChipInput
          value={state.ccRecipients}
          onChange={set("ccRecipients")}
        />
        <span className="text-[11px] font-normal normal-case tracking-normal text-[var(--color-text-soft)]">
          {t("editClient.ccHelper")}
        </span>
      </label>

      {/* Address */}
      <Field label={t("editClient.address")} htmlFor="cl-address">
        <Textarea
          id="cl-address"
          value={state.address}
          onChange={(e) => set("address")(e.target.value)}
          placeholder={t("editClient.addressPh")}
          rows={2}
        />
      </Field>

      {/* Note */}
      <Field label={t("editClient.note")} htmlFor="cl-note">
        <Textarea
          id="cl-note"
          value={state.note}
          onChange={(e) => set("note")(e.target.value)}
          placeholder={t("editClient.notePh")}
          rows={2}
        />
      </Field>

      {/* Initials */}
      <Field label={t("newClient.initials")} htmlFor="cl-initials">
        <Input
          id="cl-initials"
          value={state.initials}
          onChange={(e) =>
            set("initials")(e.target.value.toUpperCase().slice(0, 3))
          }
          placeholder="AR"
          maxLength={3}
          className="w-[120px]"
        />
      </Field>

      {/* Rate */}
      <Field label={t("newClient.rate")} htmlFor="cl-rate">
        <RateSlider
          value={state.hourlyRate}
          onChange={set("hourlyRate")}
          currency={currency}
        />
      </Field>

      {/* Accent color */}
      <Field label={t("newClient.color")}>
        <ColorPicker
          value={state.accentColor}
          onChange={set("accentColor")}
          ariaLabel={t("newClient.color")}
        />
      </Field>
    </div>
  );
}

// ─── ClientModal (unified create + edit) ───────────────────────────────────────

export type ClientModalProps =
  | {
      mode: "create";
      open: boolean;
      onOpenChange: (next: boolean) => void;
      onCreated?: (c: Client) => void;
    }
  | {
      mode: "edit";
      client: Client;
      open: boolean;
      onOpenChange: (next: boolean) => void;
      onSaved?: (c: Client) => void;
    };

export function ClientModal(props: ClientModalProps) {
  const { t } = useLocale();
  const router = useRouter();
  const isEdit = props.mode === "edit";

  const [state, setState] = React.useState<FormState>(() =>
    makeDefaultState(isEdit ? props.client : undefined),
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currency, setCurrency] = React.useState<string>("USD");

  // Re-fill when client prop changes (e.g. switching which card was clicked)
  React.useEffect(() => {
    if (props.open) {
      setState(makeDefaultState(isEdit ? props.client : undefined));
      setError(null);
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  // Hydrate currency (and, in create mode, the default rate) from settings
  // every time the modal opens, so the rate slider always shows the user's
  // current currency next to the value.
  React.useEffect(() => {
    if (!props.open) return;
    let cancelled = false;
    fetch("/api/agency/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data:
            | { defaultHourlyRate?: number; businessCurrency?: string }
            | null,
        ) => {
          if (cancelled || !data) return;
          if (data.businessCurrency) setCurrency(data.businessCurrency);
          if (!isEdit && data.defaultHourlyRate) {
            setState((prev) => ({
              ...prev,
              hourlyRate: String(data.defaultHourlyRate),
            }));
          }
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [props.open, isEdit]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const ccSend =
      state.ccRecipients.length > 0 ? state.ccRecipients : null;
    const emailSend = state.email.trim() || null;
    const addressSend = state.address.trim() || null;
    const noteSend = state.note.trim() || null;

    try {
      let res: Response;

      if (isEdit) {
        res = await fetch(`/api/agency/clients/${props.client.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: state.name,
            initials: state.initials || undefined,
            accentColor: state.accentColor,
            hourlyRate: Number(state.hourlyRate),
            email: emailSend,
            address: addressSend,
            ccRecipients: ccSend,
            note: noteSend,
          }),
        });
      } else {
        res = await fetch("/api/agency/clients", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: state.name,
            initials: state.initials || undefined,
            accentColor: state.accentColor,
            hourlyRate: Number(state.hourlyRate),
            email: emailSend,
            address: addressSend,
            ccRecipients: ccSend,
            note: noteSend,
          }),
        });
      }

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `Request failed (${res.status})`);
      }

      const saved = (await res.json()) as Client;
      props.onOpenChange(false);
      if (isEdit) {
        props.onSaved?.(saved);
      } else {
        props.onCreated?.(saved);
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const title = isEdit ? t("editClient.title") : t("newClient.title");
  const subtitle = isEdit ? undefined : t("newClient.subtitle");
  const submitLabel = isEdit
    ? submitting
      ? t("editClient.saving")
      : t("editClient.submit")
    : submitting
      ? t("modal.creating")
      : t("newClient.submit");

  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      ariaLabel={title}
      width={520}
    >
      <ModalCloseButton onClick={() => props.onOpenChange(false)} />
      <form onSubmit={onSubmit} className="flex flex-col overflow-y-auto">
        <header className="flex flex-col gap-[4px] px-[24px] pb-[16px] pt-[24px]">
          <h2 className="text-[20px] font-semibold leading-[26px] tracking-tight text-[var(--color-text-strong)]">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-[13px] text-[var(--color-text-soft)]">
              {subtitle}
            </p>
          ) : null}
        </header>

        <FormBody
          state={state}
          setState={setState}
          isEdit={isEdit}
          currency={currency}
        />

        {error ? (
          <p className="px-[24px] pt-[12px] text-[12px] text-rose-300">
            {error}
          </p>
        ) : null}

        <footer className="mt-[12px] flex items-center justify-end gap-[8px] border-t border-[var(--color-stroke-soft)] px-[24px] py-[16px]">
          <Button
            type="button"
            variant="ghost"
            onClick={() => props.onOpenChange(false)}
          >
            {t("modal.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary-orange"
            disabled={submitting || !state.name.trim()}
          >
            {submitLabel}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

// ─── Rate slider with currency suffix ──────────────────────────────────────────

const RATE_MIN = 5;
const RATE_MAX = 500;

function RateSlider({
  value,
  onChange,
  currency,
}: {
  value: string;
  onChange: (next: string) => void;
  currency: string;
}) {
  const num = Number(value);
  const safe = Number.isFinite(num) && num > 0 ? num : RATE_MIN;
  const sliderValue = Math.min(Math.max(safe, RATE_MIN), RATE_MAX);
  const pct = ((sliderValue - RATE_MIN) / (RATE_MAX - RATE_MIN)) * 100;
  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex items-center gap-[12px]">
        <input
          id="cl-rate"
          type="range"
          min={RATE_MIN}
          max={RATE_MAX}
          step={1}
          value={sliderValue}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Hourly rate"
          className="h-[24px] flex-1 cursor-pointer appearance-none bg-transparent outline-none focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-[var(--color-brand-400)] [&::-moz-range-thumb]:h-[16px] [&::-moz-range-thumb]:w-[16px] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--color-accent-orange)] [&::-moz-range-thumb]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent-orange)_25%,transparent)] [&::-moz-range-track]:h-[6px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[var(--color-bg-tint-8)] [&::-webkit-slider-runnable-track]:h-[6px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:h-[16px] [&::-webkit-slider-thumb]:w-[16px] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-accent-orange)] [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent-orange)_25%,transparent)]"
          style={{
            background: `linear-gradient(to right, var(--color-accent-orange) 0%, var(--color-accent-orange) ${pct}%, var(--color-bg-tint-8) ${pct}%, var(--color-bg-tint-8) 100%)`,
            backgroundSize: "100% 6px",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="flex items-center gap-[6px] rounded-[6px] bg-[var(--color-bg-tint-3)] px-[10px] py-[6px] ring-1 ring-[var(--color-stroke-soft)]">
          <input
            type="number"
            inputMode="decimal"
            min={1}
            step={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
            className="w-[64px] bg-transparent text-right text-[13px] font-semibold tabular-nums normal-case tracking-normal text-[var(--color-text-strong)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-[12px] font-medium normal-case tracking-normal text-[var(--color-text-soft)]">
            {currency}/h
          </span>
        </div>
      </div>
    </div>
  );
}
