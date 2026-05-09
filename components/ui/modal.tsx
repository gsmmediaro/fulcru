"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { RiCloseLine } from "@remixicon/react";
import { cn } from "@/lib/cn";

type ModalProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  width?: number;
};

export function Modal({
  open,
  onOpenChange,
  children,
  className,
  ariaLabel,
  width = 620,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 0);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onOpenChange]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[90] flex items-center justify-center p-[16px] sm:p-[24px]",
        "bg-black/62 backdrop-blur-[2px]",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
      )}
      data-state="open"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        style={{ maxWidth: `${width}px` }}
        className={cn(
          "modal-panel modal-rise relative flex w-full flex-col overflow-hidden",
          "rounded-[8px] bg-[var(--color-bg-surface)] outline-none",
          "ring-1 ring-[var(--color-stroke-soft)]",
          "shadow-[0_18px_40px_rgb(0_0_0/0.48)]",
          "max-h-[min(810px,calc(100dvh-48px))]",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClick}
      className={cn(
        "absolute right-[16px] top-[16px] flex size-[32px] items-center justify-center rounded-[6px]",
        "text-[var(--color-text-soft)] hover:text-[var(--color-text-strong)]",
        "hover:bg-[var(--color-bg-tint-6)]",
        "transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-[var(--color-brand-400)] focus-visible:outline-offset-2",
      )}
    >
      <RiCloseLine size={20} />
    </button>
  );
}
