"use client";

import * as React from "react";
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react";
import { cn } from "@/lib/cn";

export function CopyIdButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          void navigator.clipboard.writeText(value);
        }
        setCopied(true);
      }}
      className={cn(
        "inline-flex h-[32px] items-center gap-[6px] rounded-[6px] px-[10px]",
        "text-[12px] font-semibold text-[var(--color-text-sub)]",
        "ring-1 ring-[var(--color-stroke-soft)]",
        "transition-colors duration-150 hover:text-[var(--color-text-strong)] hover:ring-[var(--color-stroke-sub)]",
      )}
    >
      {copied ? (
        <RiCheckLine size={14} className="text-emerald-300" />
      ) : (
        <RiFileCopyLine size={14} />
      )}
      <span className="font-mono">{copied ? "Copied" : value}</span>
    </button>
  );
}
