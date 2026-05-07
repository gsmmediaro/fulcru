"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

export function GoogleButton({
  label,
  callbackURL,
  className,
}: {
  label: string;
  callbackURL: string;
  className?: string;
}) {
  const [pending, setPending] = React.useState(false);

  async function start() {
    setPending(true);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL });
    } catch (err) {
      console.error(err);
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={pending}
      className={cn(
        "inline-flex h-[44px] w-full items-center justify-center gap-[10px] rounded-[8px]",
        "bg-[var(--color-bg-surface-elevated)] text-[14px] font-semibold text-[var(--color-text-strong)]",
        "ring-1 ring-[var(--color-stroke-soft)] ring-inset",
        "hover:bg-[color-mix(in_oklab,white_4%,var(--color-bg-surface-elevated))] hover:ring-[var(--color-stroke-sub)]",
        "active:scale-[0.99]",
        "transition-[background-color,box-shadow,scale] duration-150",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
        className,
      )}
    >
      <GoogleMark />
      <span>{label}</span>
    </button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      <path
        fill="#4285F4"
        d="M21.6 12.227c0-.681-.061-1.337-.175-1.967H12v3.722h5.382a4.604 4.604 0 0 1-1.997 3.022v2.51h3.232c1.892-1.741 2.983-4.305 2.983-7.287z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.962-.896 6.617-2.426l-3.232-2.51c-.896.6-2.04.957-3.385.957-2.605 0-4.81-1.76-5.595-4.123H3.066v2.59A9.997 9.997 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.405 13.898A6.012 6.012 0 0 1 6.09 12c0-.66.114-1.298.314-1.898V7.512H3.066A9.998 9.998 0 0 0 2 12c0 1.614.388 3.14 1.066 4.488l3.339-2.59z"
      />
      <path
        fill="#EA4335"
        d="M12 6.422c1.469 0 2.785.504 3.823 1.498l2.866-2.867C16.957 3.453 14.694 2.5 12 2.5a9.997 9.997 0 0 0-8.934 5.512l3.339 2.59C7.19 8.182 9.395 6.422 12 6.422z"
      />
    </svg>
  );
}
