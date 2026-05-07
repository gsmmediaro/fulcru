"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RiAddLine } from "@remixicon/react";
import { Modal, ModalCloseButton } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";

export function NewClientButton() {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="outline"
        leadingIcon={<RiAddLine size={16} />}
        onClick={() => setOpen(true)}
      >
        {t("clients.new")}
      </Button>
      <NewClientModal open={open} onOpenChange={setOpen} />
    </>
  );
}

function NewClientModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [initials, setInitials] = React.useState("");
  const [hourlyRate, setHourlyRate] = React.useState<string>("150");
  const [accentColor, setAccentColor] = React.useState("#FF7A1A");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setInitials("");
      setHourlyRate("150");
      setAccentColor("#FF7A1A");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/agency/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          initials: initials || undefined,
          accentColor,
          hourlyRate: Number(hourlyRate),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel="Create a new client"
      width={520}
    >
      <ModalCloseButton onClick={() => onOpenChange(false)} />
      <form onSubmit={onSubmit} className="flex flex-col">
        <header className="flex flex-col gap-[4px] px-[24px] pb-[16px] pt-[24px]">
          <h2 className="text-[20px] font-semibold leading-[26px] tracking-tight text-[var(--color-text-strong)]">
            {t("newClient.title")}
          </h2>
          <p className="text-[13px] text-[var(--color-text-soft)]">
            {t("newClient.subtitle")}
          </p>
        </header>

        <div className="flex flex-col gap-[16px] px-[24px] pb-[8px]">
          <Field label={t("newClient.name")} htmlFor="cl-name">
            <Input
              id="cl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("newClient.namePh")}
              required
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-[12px]">
            <Field label={t("newClient.initials")} htmlFor="cl-initials">
              <Input
                id="cl-initials"
                value={initials}
                onChange={(e) =>
                  setInitials(e.target.value.toUpperCase().slice(0, 3))
                }
                placeholder="AR"
                maxLength={3}
              />
            </Field>
            <Field label={t("newClient.rate")} htmlFor="cl-rate">
              <Input
                id="cl-rate"
                type="number"
                inputMode="decimal"
                min={1}
                step={5}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                required
              />
            </Field>
          </div>

          <Field label={t("newClient.color")}>
            <ColorPicker
              value={accentColor}
              onChange={setAccentColor}
              ariaLabel={t("newClient.color")}
            />
          </Field>
        </div>

        {error ? (
          <p className="px-[24px] pt-[12px] text-[12px] text-rose-300">
            {error}
          </p>
        ) : null}

        <footer className="mt-[12px] flex items-center justify-end gap-[8px] border-t border-[var(--color-stroke-soft)] px-[24px] py-[16px]">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("modal.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary-orange"
            disabled={submitting || !name.trim()}
          >
            {submitting ? t("modal.creating") : t("newClient.submit")}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

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
        "h-[40px] w-full rounded-[6px] bg-[color-mix(in_oklab,white_3%,transparent)]",
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
        "min-h-[80px] w-full rounded-[6px] bg-[color-mix(in_oklab,white_3%,transparent)]",
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
