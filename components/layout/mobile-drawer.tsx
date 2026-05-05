"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Sidebar } from "./sidebar";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  // ESC to close + body scroll lock while open
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Focus the panel when it opens — keeps focus out of the page behind
  const panelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-40 xl:hidden",
        "pointer-events-none",
        open && "pointer-events-auto",
      )}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/55 backdrop-blur-[2px]",
          "transition-opacity duration-250 ease-out",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Sliding panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Primary navigation"
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 left-0 w-[248px] max-w-[86vw]",
          "outline-none",
          "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0" : "-translate-x-full",
          "shadow-[0_16px_40px_-8px_rgba(0,0,0,0.55)]",
        )}
      >
        <Sidebar />
      </div>
    </div>
  );
}
