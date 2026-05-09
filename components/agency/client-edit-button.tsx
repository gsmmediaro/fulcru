"use client";

import * as React from "react";
import { RiMoreLine, RiEditLine } from "@remixicon/react";
import { ClientModal } from "@/components/agency/client-modal";
import { cn } from "@/lib/cn";
import type { Client } from "@/lib/agency/types";

export function ClientEditButton({ client }: { client: Client }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu on outside click
  React.useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-label="Actions"
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            "flex size-[28px] items-center justify-center rounded-[6px]",
            "text-[var(--color-text-soft)] hover:text-[var(--color-text-strong)]",
            "hover:bg-[var(--color-bg-tint-6)]",
            "transition-colors duration-150",
            "focus-visible:outline-2 focus-visible:outline-[var(--color-brand-400)] focus-visible:outline-offset-2",
          )}
        >
          <RiMoreLine size={16} />
        </button>

        {menuOpen && (
          <div
            className={cn(
              "absolute right-0 top-[calc(100%+4px)] z-[10]",
              "min-w-[128px] rounded-[8px] py-[4px]",
              "bg-[var(--color-bg-surface-elevated)]",
              "ring-1 ring-[var(--color-stroke-soft)]",
              "shadow-[0_8px_24px_rgb(0_0_0/0.32)]",
            )}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setModalOpen(true);
              }}
              className={cn(
                "flex w-full items-center gap-[8px] px-[12px] py-[8px]",
                "text-[13px] font-medium text-[var(--color-text-strong)]",
                "hover:bg-[var(--color-bg-tint-5)]",
                "transition-colors duration-150",
              )}
            >
              <RiEditLine size={14} className="text-[var(--color-text-soft)]" />
              Edit
            </button>
          </div>
        )}
      </div>

      <ClientModal
        mode="edit"
        client={client}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
