"use client";

import * as React from "react";
import {
  RiStackLine,
  RiAddLine,
  RiCloseLine,
  RiInformationLine,
} from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export default function OrganizationsPage() {
  const [open, setOpen] = React.useState(false);

  return (
    <AppShell>
      <div className="flex items-center gap-[14px]">
        <span
          className={cn(
            "flex size-[44px] shrink-0 items-center justify-center rounded-full",
            "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
          )}
        >
          <RiStackLine size={20} />
        </span>
        <div className="flex flex-col">
          <h1 className="text-[26px] font-medium leading-[34px] tracking-tight sm:text-[28px] md:text-[32px] md:leading-[42px]">
            Welcome to organizations!
          </h1>
          <p className="mt-[2px] text-[13px] text-[var(--color-text-soft)]">
            Group team members, share usage, and centralize billing.
          </p>
        </div>
      </div>

      <div className="enter-stagger mt-[24px] flex justify-center">
        <section
          className={cn(
            "flex w-full max-w-[520px] flex-col items-center gap-[16px] rounded-[12px] p-[28px] text-center",
            "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
          )}
        >
          <span
            className={cn(
              "flex size-[64px] items-center justify-center rounded-full",
              "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
            )}
          >
            <RiStackLine size={28} />
          </span>
          <p className="text-[16px] font-semibold text-[var(--color-text-strong)]">
            Create your first organization to start
          </p>
          <p className="text-[13px] leading-[20px] text-[var(--color-text-soft)]">
            Organizations let you invite teammates, split traffic across
            sub-accounts, and consolidate invoices into one workspace.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="mt-[4px] rounded-[8px] px-[18px]"
            leadingIcon={<RiAddLine size={16} />}
            onClick={() => setOpen(true)}
          >
            Create Organization
          </Button>
        </section>
      </div>

      {open ? <CreateOrgModal onClose={() => setOpen(false)} /> : null}
    </AppShell>
  );
}

function CreateOrgModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = React.useState("");
  const [seats, setSeats] = React.useState("3");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[16px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-org-title"
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={cn(
          "modal-rise relative w-full max-w-[480px] rounded-[14px] p-[24px]",
          "bg-[var(--color-bg-surface-elevated)] ring-1 ring-[var(--color-stroke-sub)]",
          "shadow-[var(--shadow-regular-lg)]",
        )}
      >
        <header className="flex items-start justify-between gap-[12px]">
          <div className="flex flex-col gap-[2px]">
            <h2
              id="create-org-title"
              className="text-[18px] font-semibold leading-[24px]"
            >
              Create organization
            </h2>
            <p className="text-[13px] text-[var(--color-text-soft)]">
              You can invite teammates and adjust seats later.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "flex size-[32px] items-center justify-center rounded-[6px]",
              "text-[var(--color-text-soft)] hover:bg-white/5 hover:text-[var(--color-text-strong)]",
            )}
          >
            <RiCloseLine size={18} />
          </button>
        </header>

        <div className="mt-[16px] flex flex-col gap-[14px]">
          <Field label="Organization name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
              className={cn(
                "h-[44px] rounded-[8px] px-[14px]",
                "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
                "text-[14px] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-soft)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-400)]",
              )}
            />
          </Field>

          <Field
            label="Initial seats"
            hint="Each seat is a teammate that can use this organization's traffic."
          >
            <input
              type="number"
              min={1}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className={cn(
                "h-[44px] w-[120px] rounded-[8px] px-[14px]",
                "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
                "text-[14px] tabular-nums text-[var(--color-text-strong)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-400)]",
              )}
            />
          </Field>
        </div>

        <footer className="mt-[20px] flex justify-end gap-[8px]">
          <Button
            variant="ghost"
            size="md"
            className="rounded-[8px]"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="rounded-[8px]"
            onClick={onClose}
            disabled={!name.trim()}
          >
            Create
          </Button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[8px]">
      <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="inline-flex items-start gap-[6px] text-[12px] text-[var(--color-text-soft)]">
          <RiInformationLine size={12} className="mt-[2px] shrink-0" />
          {hint}
        </span>
      ) : null}
    </label>
  );
}
