"use client";

import * as React from "react";
import { RiLogoutBoxRLine } from "@remixicon/react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

export function OnboardingTopRight({
  userName,
  userImage,
}: {
  userName: string;
  userImage?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const initials = (userName ?? "?")
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-[36px] items-center justify-center rounded-full bg-[var(--color-bg-surface-elevated)] text-[12px] font-semibold text-[var(--color-text-strong)] ring-1 ring-[var(--color-stroke-soft)] hover:ring-[var(--color-stroke-sub)]"
      >
        {userImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={userImage} alt="" className="size-full rounded-full object-cover" />
        ) : (
          <span>{initials || "?"}</span>
        )}
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-[44px] z-10 w-[200px] rounded-[8px]",
            "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)] shadow-[var(--shadow-regular-md)]",
            "p-[6px]",
          )}
        >
          <div className="px-[10px] py-[6px] text-[12px] text-[var(--color-text-soft)] truncate">
            {userName}
          </div>
          <button
            type="button"
            onClick={() => authClient.signOut().then(() => (window.location.href = "/"))}
            className="flex w-full items-center gap-[8px] rounded-[6px] px-[10px] py-[8px] text-left text-[13px] text-[var(--color-text-strong)] hover:bg-[color-mix(in_oklab,white_5%,transparent)]"
          >
            <RiLogoutBoxRLine size={14} />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
